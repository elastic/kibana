/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants, createHash, createSign, randomUUID } from 'crypto';
import { CLIENT_ASSERTION_TYPE } from '@kbn/connector-specs';

const JWT_LIFETIME_SEC = 600; // 10 minutes

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Normalizes a PEM string by ensuring proper line breaks.
 *
 * PEM format requires base64 content wrapped at 64 characters with newlines.
 * When PEM content passes through secret storage (encrypted saved objects)
 * or is pasted from a UI text field, line breaks can be stripped or corrupted,
 * causing OpenSSL to reject the key with "DECODER routines::unsupported".
 */
function normalizePem(input: string): string {
  const match = input.match(/-----BEGIN ([^-]+)-----\s*([\s\S]+?)\s*-----END ([^-]+)-----/);
  if (!match) {
    throw new Error('Invalid PEM: missing BEGIN/END markers');
  }

  const [, beginType, base64Content, endType] = match;
  if (beginType !== endType) {
    throw new Error(`Invalid PEM: mismatched markers (BEGIN ${beginType} / END ${endType})`);
  }
  const cleanBase64 = base64Content.replace(/\s+/g, '');
  const lines = cleanBase64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${beginType}-----\n${lines.join('\n')}\n-----END ${beginType}-----\n`;
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
 *
 * BREAKING: Changed from RS256 (PKCS#1 v1.5) to PS256 (RSA-PSS + SHA-256)
 * to align with Microsoft Entra ID recommendations. Existing connectors
 * deployed under the previous RS256 implementation will need to be
 * re-configured, as assertions signed with the old algorithm will no
 * longer validate against the new signature scheme.
 */
export function buildClientAssertion({
  tokenUrl,
  clientId,
  certificate,
  privateKey,
  passphrase,
}: BuildClientAssertionOpts): string {
  const x5tS256 = computeCertificateThumbprint(certificate);

  const header = { alg: 'PS256', typ: 'JWT', 'x5t#S256': x5tS256 };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: tokenUrl,
    iss: clientId,
    sub: clientId,
    jti: randomUUID(),
    iat: now,
    nbf: now,
    exp: now + JWT_LIFETIME_SEC,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const normalizedKey = normalizePem(privateKey);
  const signer = createSign('sha256');
  signer.update(signingInput);
  const signatureBuffer = signer.sign({
    key: normalizedKey,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    ...(passphrase ? { passphrase } : {}),
  });
  const encodedSignature = base64UrlEncode(signatureBuffer);

  return `${signingInput}.${encodedSignature}`;
}

export { CLIENT_ASSERTION_TYPE };
