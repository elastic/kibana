/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrivateKey, createSign } from 'crypto';
import type { Logger } from '@kbn/core/server';

/**
 * Mints short-lived, repo-scoped GitHub App *installation tokens* — the proper
 * "Pattern B" credential for letting a sandbox clone/push a repo.
 *
 * Why an App (vs a PAT): an installation token is minted on demand, expires in
 * ~1h, and is scoped to exactly the repos + permissions the App was installed
 * with. The long-lived secret (the App private key) never leaves Kibana; only
 * the ephemeral token crosses into the sandbox, as `x-access-token`.
 *
 * Flow: sign a short JWT with the App private key (RS256) → exchange it at
 * `POST /app/installations/{id}/access_tokens` for an installation token. We use
 * Node's `crypto.createSign` (not Web Crypto) because GitHub App keys are PKCS1
 * (`BEGIN RSA PRIVATE KEY`), which Web Crypto's importKey rejects but Node's
 * classic crypto accepts directly.
 */

const GITHUB_API = 'https://api.github.com';
/** App JWTs must live <=10 min; use 9 to allow for clock skew. */
const APP_JWT_LIFETIME_SECONDS = 9 * 60;

export interface GithubAppConfig {
  /** Numeric GitHub App ID. */
  appId: string;
  /** App private key PEM (PKCS1 "BEGIN RSA PRIVATE KEY" or PKCS8). */
  privateKeyPem: string;
}

export interface MintOptions {
  /**
   * Restrict the token to specific repositories (names only, e.g. `kibana`).
   * Omit to get all repos the installation covers.
   */
  repositories?: string[];
  /**
   * Restrict the token's permissions (subset of the installation's). e.g.
   * `{ contents: 'write', pull_requests: 'write' }`. Omit for the full set.
   */
  permissions?: Record<string, string>;
}

export interface MintedInstallationToken {
  token: string;
  expiresAt: string;
  permissions: Record<string, string>;
  repositorySelection?: string;
}

const base64url = (input: string | Buffer): string =>
  (typeof input === 'string' ? Buffer.from(input) : input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const normalizePrivateKeyPem = (privateKeyPem: string): string => {
  const normalized = privateKeyPem
    .trim()
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  const match = normalized.match(
    /-----BEGIN ([A-Z ]+PRIVATE KEY)-----\s*([\s\S]*?)\s*-----END \1-----/
  );
  if (!match) {
    return normalized;
  }

  const [, label, body] = match;
  const compactBody = body.replace(/\s+/g, '');
  const wrappedBody = compactBody.match(/.{1,64}/g)?.join('\n') ?? compactBody;
  return `-----BEGIN ${label}-----\n${wrappedBody}\n-----END ${label}-----`;
};

/** Sign an App JWT (RS256) using the App private key. */
const signAppJwt = (appId: string, privateKeyPem: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + APP_JWT_LIFETIME_SECONDS, iss: appId };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const pem = normalizePrivateKeyPem(privateKeyPem);
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  let signature: Buffer;
  try {
    signature = signer.sign(createPrivateKey(pem));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `GitHub App private key is not a valid unencrypted PEM private key (${message}). ` +
        'Download a new private key from the GitHub App settings and paste the full PEM, including BEGIN/END lines.'
    );
  }
  return `${signingInput}.${base64url(signature)}`;
};

const ghFetch = async (
  path: string,
  { method = 'GET', token, body }: { method?: string; token: string; body?: unknown } = {
    token: '',
  }
): Promise<unknown> => {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${method} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
};

const isUnknownAppError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('/app/installations failed (404)') && message.includes('Integration not found')
  );
};

const unknownAppMessage = (appId: string): string =>
  `GitHub App ${appId} was not found by GitHub. Check that the connector App ID is the numeric App ID from GitHub App settings, and that the private key was generated for that same app. Do not use the installation ID, client ID, or client secret.`;

export class GithubAppTokenMinter {
  constructor(private readonly config: GithubAppConfig, private readonly logger?: Logger) {}

  /**
   * Find the installation id for a given account login (the owner of the repo
   * the App was installed on). Cached would be nice, but installs are rare so a
   * lookup per mint is fine; callers can pass the id directly to skip it.
   */
  async findInstallationId(accountLogin: string): Promise<number> {
    const jwt = signAppJwt(this.config.appId, this.config.privateKeyPem);
    let installations: Array<{ id: number; account?: { login?: string } }>;
    try {
      installations = (await ghFetch('/app/installations', { token: jwt })) as Array<{
        id: number;
        account?: { login?: string };
      }>;
    } catch (error) {
      if (isUnknownAppError(error)) {
        throw new Error(unknownAppMessage(this.config.appId));
      }
      throw error;
    }
    const match = installations.find(
      (i) => i.account?.login?.toLowerCase() === accountLogin.toLowerCase()
    );
    if (!match) {
      throw new Error(
        `GitHub App ${this.config.appId} has no installation on "${accountLogin}" ` +
          `(found: ${installations.map((i) => i.account?.login).join(', ') || 'none'})`
      );
    }
    return match.id;
  }

  /**
   * Mint an installation token, optionally scoped to specific repos/permissions.
   * The token is short-lived (~1h) and never persisted.
   */
  async mintInstallationToken(
    installationId: number,
    opts: MintOptions = {}
  ): Promise<MintedInstallationToken> {
    const jwt = signAppJwt(this.config.appId, this.config.privateKeyPem);
    const body: Record<string, unknown> = {};
    if (opts.repositories?.length) body.repositories = opts.repositories;
    if (opts.permissions) body.permissions = opts.permissions;

    const result = (await ghFetch(`/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      token: jwt,
      body: Object.keys(body).length ? body : undefined,
    })) as {
      token: string;
      expires_at: string;
      permissions: Record<string, string>;
      repository_selection?: string;
    };

    this.logger?.info(
      `Minted GitHub App installation token (install ${installationId}, expires ${result.expires_at}, ` +
        `perms ${JSON.stringify(result.permissions)})`
    );
    return {
      token: result.token,
      expiresAt: result.expires_at,
      permissions: result.permissions,
      repositorySelection: result.repository_selection,
    };
  }

  /**
   * Convenience: resolve the installation for `accountLogin` and mint a token
   * scoped to `repositories` with `permissions`. Returns the token + metadata.
   */
  async mintForAccount(
    accountLogin: string,
    opts: MintOptions = {}
  ): Promise<MintedInstallationToken> {
    const installationId = await this.findInstallationId(accountLogin);
    return this.mintInstallationToken(installationId, opts);
  }
}
