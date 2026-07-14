/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DeviceFlowSignal } from './github_device_flow_errors';

/**
 * Obtains a GitHub App *user access token* via the OAuth Device Flow — the App
 * acting *as the human* ("act as me").
 *
 * Why this (vs an installation token or a PAT): reading a *private elastic* repo
 * or issue requires the human's org/SSO access. A demo App installed only on a
 * personal account can't reach `elastic/*` with an installation token. A user
 * access token inherits the human's access (SSO included) but, unlike a classic
 * PAT, is short-lived and revocable and capped by the App's declared permission
 * set. So we keep the "App-grade, scoped, expiring" credential story for the
 * read, and reserve the installation token for the sandbox's push/PR-on-fork.
 *
 * Device Flow is chosen over the web (redirect/callback) flow because it needs
 * no callback URL, no web server, and no client secret in a browser — ideal for
 * a local Kibana. Kibana requests a device+user code, shows the user code +
 * verification URL in the conversation UI, the human approves once in a browser,
 * and Kibana polls for the resulting token.
 *
 * Dependency-free (Node `fetch` only), same rationale as the other minters.
 */

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

export interface DeviceCodeResponse {
  /** Short code the human types at `verificationUri`, e.g. "WDJB-MJHT". */
  userCode: string;
  /** URL the human opens to enter the code (usually github.com/login/device). */
  verificationUri: string;
  /** Opaque code Kibana polls with; not shown to the user. */
  deviceCode: string;
  /** Seconds between polls (GitHub asks us to respect this). */
  intervalSeconds: number;
  /** Seconds until the user/device code expires. */
  expiresInSeconds: number;
}

export interface UserAccessToken {
  token: string;
  tokenType: string;
  /** App user tokens are short-lived when the App expires them; seconds. */
  expiresInSeconds?: number;
  refreshToken?: string;
  refreshTokenExpiresInSeconds?: number;
  scope?: string;
}

export { DeviceFlowSignal } from './github_device_flow_errors';

const form = async (url: string, params: Record<string, string>): Promise<unknown> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    throw new Error(`GitHub device flow ${url} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
};

export class GithubUserTokenMinter {
  constructor(private readonly clientId: string, private readonly logger?: Logger) {}

  /**
   * Step 1: request a device + user code. The `scope` is only honored for
   * classic OAuth Apps; GitHub *Apps* derive scope from their declared
   * permissions, so pass `undefined` for a GitHub App.
   */
  async requestDeviceCode(scope?: string): Promise<DeviceCodeResponse> {
    const data = (await form(DEVICE_CODE_URL, {
      client_id: this.clientId,
      ...(scope ? { scope } : {}),
    })) as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      expires_in: number;
      interval: number;
    };
    this.logger?.info(
      `GitHub device flow started: user_code=${data.user_code} at ${data.verification_uri}`
    );
    return {
      userCode: data.user_code,
      verificationUri: data.verification_uri,
      deviceCode: data.device_code,
      intervalSeconds: data.interval,
      expiresInSeconds: data.expires_in,
    };
  }

  /**
   * Step 2 (single poll): exchange the device code for a user token. Throws
   * {@link DeviceAuthorizationPending} while the human hasn't approved and
   * {@link DeviceSlowDown} when GitHub asks us to back off. Callers loop.
   */
  async pollForToken(deviceCode: string): Promise<UserAccessToken> {
    const data = (await form(TOKEN_URL, {
      client_id: this.clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
      error?: string;
      interval?: number;
    };

    if (data.error === 'authorization_pending') throw new DeviceFlowSignal('authorization_pending');
    if (data.error === 'slow_down') throw new DeviceFlowSignal('slow_down', data.interval ?? 5);
    if (data.error) throw new Error(`GitHub device flow error: ${data.error}`);
    if (!data.access_token) throw new Error('GitHub device flow returned no access_token');

    this.logger?.info(
      `GitHub user access token acquired (expires_in=${data.expires_in ?? 'n/a'}s)`
    );
    return {
      token: data.access_token,
      tokenType: data.token_type ?? 'bearer',
      expiresInSeconds: data.expires_in,
      refreshToken: data.refresh_token,
      refreshTokenExpiresInSeconds: data.refresh_token_expires_in,
      scope: data.scope,
    };
  }

  /**
   * Convenience: poll until approved, honoring GitHub's interval + slow_down,
   * aborting when the device code expires or `abortSignal` fires. `onPending`
   * fires each idle poll so callers can keep a UI item "live".
   */
  async waitForToken(
    device: DeviceCodeResponse,
    opts: { onPending?: () => void; abortSignal?: AbortSignal } = {}
  ): Promise<UserAccessToken> {
    const deadline = Date.now() + device.expiresInSeconds * 1000;
    let intervalMs = device.intervalSeconds * 1000;

    while (true) {
      opts.abortSignal?.throwIfAborted?.();
      if (Date.now() >= deadline) {
        throw new Error('GitHub device code expired before authorization');
      }
      try {
        return await this.pollForToken(device.deviceCode);
      } catch (err) {
        if (err instanceof DeviceFlowSignal && err.code === 'authorization_pending') {
          opts.onPending?.();
        } else if (err instanceof DeviceFlowSignal && err.code === 'slow_down') {
          intervalMs = ((err.intervalSeconds ?? 5) + 5) * 1000;
        } else {
          throw err;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
