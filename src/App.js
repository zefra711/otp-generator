import React, { useState, useEffect } from 'react';
import './App.css';

// Simple TOTP implementation
function base32Decode(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < encoded.length; i++) {
    const val = alphabet.indexOf(encoded.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(bytes);
}

async function hmacSha1(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

async function generateTOTP(secret) {
  try {
    const key = base32Decode(secret);
    const time = Math.floor(Date.now() / 1000 / 30);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, time, false);
    
    const hmac = await hmacSha1(key, timeBuffer);
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000;
    
    return code.toString().padStart(6, '0');
  } catch {
    return 'Invalid';
  }
}

function App() {
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!secret) return;

    const updateOTP = async () => {
      const token = await generateTOTP(secret);
      setOtp(token);
    };

    const updateTimer = () => {
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeLeft(remaining);
    };

    updateOTP();
    updateTimer();

    const interval = setInterval(() => {
      updateOTP();
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [secret]);

  return (
    <div className="app">
      <h1>OTP Authenticator</h1>
      <div className="input-section">
        <input
          type="text"
          placeholder="Enter secret key"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="secret-input"
        />
      </div>
      {secret && (
        <div className="otp-section">
          <div className="otp-code">{otp}</div>
          <div className="timer">
            <div className="timer-bar" style={{width: `${(timeLeft / 30) * 100}%`}}></div>
            <span>{timeLeft}s</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;