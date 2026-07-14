/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { GithubUserTokenMinter, type UserAccessToken } from './github_user_token_minter';
import type { OpencodeRunProgress } from './types';

/**
 * Resolves a GitHub App *user access token* (Device Flow) for sandbox git/`gh`
 * operations, surfacing the "open this URL + enter this code" step as a live
 * `credential` item in the OpenCode timeline.
 *
 * The token acts as the human, so it reads private repos the user can access
 * (e.g. `elastic/*`) — something a personal-account App installation token
 * cannot do. It is short-lived and revocable (unlike a classic PAT), preserving
 * the "App-grade, scoped, expiring" credential story for the read path.
 *
 * Tokens are cached per cache-key (space id today; a user id would be stricter)
 * so the human approves at most once per session. A small safety margin retires
 * a token before it actually expires.
 */

const EXPIRY_SAFETY_MARGIN_MS = 60_000;
const CREDENTIAL_ITEM_ID = 'github-user-auth';

interface CachedToken {
  token: string;
  /** Absolute epoch ms after which we must re-auth (undefined => no expiry). */
  expiresAtMs?: number;
  login?: string;
}

export interface ResolveUserTokenParams {
  cacheKey: string;
  onProgress?: (progress: OpencodeRunProgress) => void;
  abortSignal?: AbortSignal;
}

export class GithubUserCredentialSource {
  private readonly minter: GithubUserTokenMinter;
  private readonly cache = new Map<string, CachedToken>();

  constructor(clientId: string, private readonly logger: Logger) {
    this.minter = new GithubUserTokenMinter(clientId, logger);
  }

  /** True when a device-flow client id is configured (feature is available). */
  static isConfigured(clientId?: string): clientId is string {
    return typeof clientId === 'string' && clientId.length > 0;
  }

  private cached(cacheKey: string): CachedToken | undefined {
    const entry = this.cache.get(cacheKey);
    if (!entry) return undefined;
    if (entry.expiresAtMs && entry.expiresAtMs - EXPIRY_SAFETY_MARGIN_MS <= Date.now()) {
      this.cache.delete(cacheKey);
      return undefined;
    }
    return entry;
  }

  /**
   * Return a usable user token, running the device flow (with live UI) only when
   * there is no valid cached token. Returns `undefined` if the user never
   * approves (expired/aborted) — callers treat that as "no read credential".
   */
  async resolve({
    cacheKey,
    onProgress,
    abortSignal,
  }: ResolveUserTokenParams): Promise<{ token: string; login?: string } | undefined> {
    const hit = this.cached(cacheKey);
    if (hit) {
      this.logger.debug(`Reusing cached GitHub user token for ${cacheKey}`);
      return { token: hit.token, login: hit.login };
    }

    try {
      const device = await this.minter.requestDeviceCode();

      onProgress?.({
        id: CREDENTIAL_ITEM_ID,
        phase: 'credential',
        label: 'GitHub authorization required',
        status: 'in_progress',
        detail:
          `Open ${device.verificationUri} and enter code ${device.userCode} to let the ` +
          `sandbox read GitHub as you. Waiting for approval...`,
      });

      const token = await this.minter.waitForToken(device, {
        abortSignal,
        onPending: () => {
          // Re-emit to keep the item "live" (and refresh the code/URL in the UI).
          onProgress?.({
            id: CREDENTIAL_ITEM_ID,
            phase: 'credential',
            label: 'Waiting for GitHub authorization',
            status: 'in_progress',
            detail: `Open ${device.verificationUri} and enter code ${device.userCode}.`,
          });
        },
      });

      const login = await this.resolveLogin(token).catch(() => undefined);
      this.store(cacheKey, token, login);

      onProgress?.({
        id: CREDENTIAL_ITEM_ID,
        phase: 'credential',
        label: login ? `Authorized as @${login}` : 'GitHub authorized',
        status: 'completed',
        detail: this.expiryDetail(token),
      });

      return { token: token.token, login };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`GitHub device-flow authorization failed: ${message}`);
      onProgress?.({
        id: CREDENTIAL_ITEM_ID,
        phase: 'credential',
        label: 'GitHub authorization not completed',
        status: 'failed',
        detail: message,
      });
      return undefined;
    }
  }

  private store(cacheKey: string, token: UserAccessToken, login?: string): void {
    this.cache.set(cacheKey, {
      token: token.token,
      login,
      expiresAtMs: token.expiresInSeconds ? Date.now() + token.expiresInSeconds * 1000 : undefined,
    });
  }

  private expiryDetail(token: UserAccessToken): string | undefined {
    if (!token.expiresInSeconds) return 'Short-lived token acquired.';
    const mins = Math.round(token.expiresInSeconds / 60);
    return `Short-lived token acquired (expires in ~${mins} min).`;
  }

  private async resolveLogin(token: UserAccessToken): Promise<string | undefined> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { login?: string };
    return data.login;
  }
}
