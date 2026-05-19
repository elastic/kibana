/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * JWT client assertion builder for OAuth2 client_credentials with a certificate.
 * Scoped to Microsoft Entra ID.
 *
 * Relationship to ./create_jwt_assertion.ts
 * ------------------------------------------
 * `create_jwt_assertion.ts` is the pre-existing, generic JWT helper used by
 * ServiceNow-style connectors. It signs with RS256, supports an optional `kid`
 * header, and takes a 3600s default lifetime. We deliberately do not call into
 * it here because the Entra cert flow needs different primitives:
 *
 *   1. algorithm:  Entra expects PS256 (RSA-PSS) while create_jwt_assertion uses
 *                  RS256. Swapping the alg per-caller there would require
 *                  threading another argument through every existing consumer.
 *   2. x5t#S256:   Entra binds the assertion to the uploaded cert via an
 *                  x5t#S256 header (base64url SHA-256 of the DER bytes).
 *                  create_jwt_assertion emits `kid` at most.
 *   3. no `kid`:   Entra ignores `kid` when x5t#S256 is present.
 *
 * These three points are the "generalization knobs" a future
 * `oauth_private_key_jwt` auth type would need to parameterize in order to
 * support providers beyond Entra (Okta, Auth0, Google, etc.). When a second
 * consumer appears, promote:
 *   - `alg`                   (e.g. 'PS256' | 'RS256' | 'ES256')
 *   - `certificateBinding`    ('x5t#S256' | 'x5c' | 'kid' | 'none')
 *   - `lifetimeSec`           (currently hard-coded to 600s)
 * into arguments, and replace this module with a backend-agnostic builder that
 * both consumers share.
 */
import { constants, createHash, createSign, randomUUID } from 'crypto';

export interface BuildClientAssertionOpts {
  tokenUrl: string;
  clientId: string;
  certificate: string;
  privateKey: string;
  passphrase?: string;
}

const JWT_LIFETIME_SEC = 600; // 10 minutes

function base64UrlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Normalizes a PEM string by re-wrapping its base64 body at 64 characters and
 * validating that BEGIN/END markers match.
 *
 * Why this exists despite the UI using a fileUpload widget (which preserves
 * newlines via FileReader.readAsText): connectors are also created by
 * non-UI callers that have to encode the PEM into a JSON string. Common shapes
 * that arrive in encrypted saved-object storage with newlines mangled:
 *
 *   - Kibana connector REST API consumers (curl, Postman) who strip newlines
 *     to make the JSON body parse, instead of escaping them as `\n`.
 *   - Terraform / Ansible / Pulumi configurations that pipe the PEM through
 *     `tr -d '\n'`, `replace(..., "\n", "")`, or a secrets manager that
 *     flattens multiline values.
 *   - CI/CD secret stores that don't round-trip newlines cleanly when the
 *     secret is pasted into their UI.
 *
 * Node's OpenSSL PEM parser rejects unwrapped base64 with
 * "PEM routines:get_name:no start line" / "DECODER routines::unsupported".
 * Re-wrapping here lets the connector keep working regardless of how the
 * secret reached storage.
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

/**
 * Builds and signs a JWT client assertion for the OAuth2 client_credentials
 * flow with certificate-based authentication. Microsoft Entra ID only.
 *
 * Header uses x5t#S256 (RFC 7515 §4.1.8) and alg PS256 (RSA-PSS + SHA-256).
 * See the file header for the rationale and for generalization knobs.
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
