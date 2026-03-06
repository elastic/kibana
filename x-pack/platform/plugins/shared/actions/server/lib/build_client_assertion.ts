/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, createSign, randomUUID } from 'crypto';

const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const JWT_LIFETIME_SEC = 600; // 10 minutes

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Extracts DER bytes from a PEM-encoded certificate and computes
 * the SHA-256 thumbprint as a base64url string (x5t#S256).
 */
export function computeCertificateThumbprint(pemCert: string): string {
  const matches = pemCert.match(
    /-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/
  );
  if (!matches || !matches[1]) {
    throw new Error('Invalid PEM certificate: could not extract certificate data');
  }

  const der = Buffer.from(matches[1].replace(/\s+/g, ''), 'base64');
  const thumbprint = createHash('sha256').update(der).digest();
  return base64UrlEncode(thumbprint);
}

export interface BuildClientAssertionOpts {
  tokenUrl: string;
  clientId: string;
  certificate: string;
  privateKey: string;
  passphrase?: string;
}

/**
 * Builds and signs a JWT client assertion for the OAuth2 client_credentials
 * flow with certificate-based authentication (Microsoft Entra ID).
 *
 * Uses x5t#S256 (SHA-256 thumbprint) per RFC 7515 section 4.1.8.
 */
export function buildClientAssertion({
  tokenUrl,
  clientId,
  certificate,
  privateKey,
  passphrase,
}: BuildClientAssertionOpts): string {
  const x5tS256 = computeCertificateThumbprint(certificate);

  const header = { alg: 'RS256', typ: 'JWT', 'x5t#S256': x5tS256 };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: tokenUrl,
    iss: clientId,
    sub: clientId,
    jti: randomUUID(),
    nbf: now,
    exp: now + JWT_LIFETIME_SEC,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signatureBuffer = signer.sign({
    key: privateKey,
    ...(passphrase ? { passphrase } : {}),
  });
  const encodedSignature = base64UrlEncode(signatureBuffer);

  return `${signingInput}.${encodedSignature}`;
}

/** The client_assertion_type value for JWT bearer assertions. */
export { CLIENT_ASSERTION_TYPE };
