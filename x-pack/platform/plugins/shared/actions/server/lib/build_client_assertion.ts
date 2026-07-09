/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds a signed JWT client assertion (RFC 7521 §4.2.2 + RFC 7523 §2.2) for
 * OAuth2 `client_credentials` flows that accept a JWT in place of
 * `client_secret`. Works for any conforming provider — Microsoft Entra, Okta,
 * Auth0, etc.
 *
 * Relationship to ./create_jwt_assertion.ts
 * ------------------------------------------
 * `create_jwt_assertion.ts` implements RFC 7523 §2.1 — the JWT is used as
 * the *grant* (`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`,
 * alongside a client_secret). This file implements §2.2 — the JWT *replaces*
 * client_secret. Different POST bodies, different subject semantics; keeping
 * them separate is intentional.
 */
import { constants, createHash, sign as cryptoSign, randomUUID } from 'crypto';
import type { JwtAlgorithm } from '@kbn/connector-specs';

export type CertificateBinding =
  | { kind: 'x5t#S256'; certificate: string }
  | { kind: 'x5c'; certificate: string }
  | { kind: 'kid'; keyId: string };

export interface BuildClientAssertionOpts {
  tokenUrl: string;
  clientId: string;
  algorithm: JwtAlgorithm;
  certificateBinding: CertificateBinding;
  privateKey: string;
  passphrase?: string;
}

const JWT_LIFETIME_SEC = 600; // 10 minutes

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

function extractDerChain(pemCert: string): string[] {
  const matches = [
    ...pemCert.matchAll(/-----BEGIN CERTIFICATE-----\s*([\s\S]+?)\s*-----END CERTIFICATE-----/g),
  ];
  if (matches.length === 0) {
    throw new Error('Invalid PEM certificate: could not extract certificate data');
  }
  return matches.map((m) => m[1].replace(/\s+/g, ''));
}

function buildBindingHeaders(binding: CertificateBinding): Record<string, string | string[]> {
  switch (binding.kind) {
    case 'x5t#S256':
      return { 'x5t#S256': computeCertificateThumbprint(binding.certificate) };
    case 'x5c':
      return { x5c: extractDerChain(binding.certificate) };
    case 'kid':
      return { kid: binding.keyId };
  }
}

function signingOptionsFor(algorithm: JwtAlgorithm) {
  switch (algorithm) {
    case 'PS256':
      return {
        signOpts: {
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
        },
      };
    case 'RS256':
      return {
        signOpts: { padding: constants.RSA_PKCS1_PADDING },
      };
    case 'ES256':
      return { signOpts: { dsaEncoding: 'ieee-p1363' as const } };
  }
}

export function buildClientAssertion({
  tokenUrl,
  clientId,
  algorithm,
  certificateBinding,
  privateKey,
  passphrase,
}: BuildClientAssertionOpts): string {
  const header = {
    alg: algorithm,
    typ: 'JWT',
    ...buildBindingHeaders(certificateBinding),
  };

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

  // Bare 'SHA256' prevents the FIPS provider from pre-binding the context to PKCS1 before PSS is applied.
  const { signOpts } = signingOptionsFor(algorithm);
  const signatureBuffer = cryptoSign('SHA256', Buffer.from(signingInput), {
    key: privateKey,
    ...signOpts,
    ...(passphrase ? { passphrase } : {}),
  });
  const encodedSignature = base64UrlEncode(signatureBuffer);

  return `${signingInput}.${encodedSignature}`;
}
