/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal GCP service-account -> OIDC ID token exchange for authenticating to a
 * Cloud Run service (the sandbox bridge). Cloud Run service-to-service auth
 * requires an *ID token* (not an access token) whose `aud` is the service URL.
 *
 * This mirrors `@kbn/connector-specs` `gcp_jwt_helpers`, inlined here because
 * those helpers are not part of that package's public entry point and deep
 * `src/` imports would violate Kibana's package boundary. Kept dependency-free
 * (Web Crypto only), same rationale as the hand-rolled ACP client.
 */

const GCP_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWT_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const TOKEN_LIFETIME_SECONDS = 3600;

export interface GcpServiceAccountKey {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
}

const base64url = (input: string | ArrayBuffer): string => {
  const bytes = typeof input === 'string' ? Buffer.from(input) : Buffer.from(new Uint8Array(input));
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const base64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  const buf = Buffer.from(base64, 'base64');
  // Buffer.buffer is a shared pool that can be larger than the data; slice to
  // the exact byte range so Web Crypto's importKey doesn't get "Invalid keyData".
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

const signJwt = async (
  privateKeyPem: string,
  payload: Record<string, unknown>
): Promise<string> => {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  // GCP SA keys are PKCS8 ("BEGIN PRIVATE KEY"). Normalise escaped "\n" (which
  // survive some JSON/ESO round-trips as literal backslash-n) back to newlines
  // before stripping the PEM armor, or the base64 body is corrupt.
  const normalisedPem = privateKeyPem.includes('\\n')
    ? privateKeyPem.replace(/\\n/g, '\n')
    : privateKeyPem;
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(normalisedPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (err) {
    throw new Error(
      `Failed to import GCP service-account private key (expected PKCS8 "BEGIN PRIVATE KEY"): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${base64url(signature)}`;
};

export const parseServiceAccountKey = (json: string): GcpServiceAccountKey => {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid service account JSON: failed to parse');
  }
  if (parsed.type !== 'service_account') {
    throw new Error(
      `Invalid service account JSON: expected type "service_account", got "${parsed.type}"`
    );
  }
  if (typeof parsed.client_email !== 'string' || typeof parsed.private_key !== 'string') {
    throw new Error('Invalid service account JSON: missing client_email or private_key');
  }
  return parsed as unknown as GcpServiceAccountKey;
};

/**
 * Exchange a service-account key for a GCP OIDC ID token scoped to `audience`
 * (the Cloud Run service URL). Valid for ~1 hour.
 */
export const getGcpIdToken = async (
  clientEmail: string,
  privateKey: string,
  audience: string
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(privateKey, {
    iss: clientEmail,
    sub: clientEmail,
    aud: GCP_TOKEN_URL,
    iat: now,
    exp: now + TOKEN_LIFETIME_SECONDS,
    target_audience: audience,
  });

  const response = await fetch(GCP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_GRANT_TYPE, assertion: jwt }).toString(),
  });
  if (!response.ok) {
    throw new Error(`GCP token exchange failed (${response.status}): ${await response.text()}`);
  }
  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) throw new Error('GCP token exchange did not return an id_token');
  return data.id_token;
};
