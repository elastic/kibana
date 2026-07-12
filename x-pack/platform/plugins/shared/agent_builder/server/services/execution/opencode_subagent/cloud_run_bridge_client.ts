/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as http from 'http';
import * as https from 'https';
import type { Logger } from '@kbn/core/server';
import { getGcpIdToken, parseServiceAccountKey } from './gcp_auth';
import { BridgeChildProcess } from './bridge_child_process';
import type { SandboxExecResult } from './sandbox_provider';

export type { BridgeChildProcess } from './bridge_child_process';

export const CLOUD_RUN_PROVIDER_ID = 'cloud-run';

export interface CloudRunBridgeConfig {
  /** …run.app URL of the deployed bridge service. */
  bridgeUrl: string;
  /** IAM audience for the ID token (usually === bridgeUrl). Empty = no auth. */
  audience?: string;
  /** Service-account key JSON (secret). Empty when the bridge is public (dev). */
  serviceAccountKeyJson?: string;
  /** Optional shared secret sent as x-bridge-token (defense in depth). */
  bridgeToken?: string;
}

/** Cached GCP OIDC ID token (Cloud Run wants ID tokens, not access tokens). */
interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * HTTP + WebSocket client for the Cloud Run agent-sandbox bridge.
 *
 * The bridge (deployed into a Cloud Run service with `--sandbox-launcher`)
 * translates these calls into local `sandbox` CLI subprocess calls. This client
 * mints a short-lived GCP ID token from the profile's service-account key and
 * attaches it as `Authorization: Bearer` so Cloud Run IAM authorizes the call
 * before it reaches the bridge — no credential ever enters the sandbox.
 *
 * HTTP calls (create/exec/putFiles/health) use Node's http/https directly; the
 * interactive stdio channel (`spawn`) uses a WebSocket via `BridgeChildProcess`.
 */
export class CloudRunBridgeClient {
  private cachedToken?: CachedToken;

  constructor(private readonly config: CloudRunBridgeConfig, private readonly logger: Logger) {}

  private async authHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (this.config.bridgeToken) headers['x-bridge-token'] = this.config.bridgeToken;

    const audience = this.config.audience || this.config.bridgeUrl;
    if (!this.config.serviceAccountKeyJson || !audience) return headers; // public/dev bridge

    const now = Date.now();
    if (!this.cachedToken || this.cachedToken.expiresAt - 60_000 < now) {
      const key = parseServiceAccountKey(this.config.serviceAccountKeyJson);
      const token = await getGcpIdToken(key.client_email, key.private_key, audience);
      // ID tokens are valid 1h; refresh a minute early.
      this.cachedToken = { token, expiresAt: now + 3600_000 };
    }
    headers.Authorization = `Bearer ${this.cachedToken.token}`;
    return headers;
  }

  private request<T>(
    method: string,
    path: string,
    body?: unknown,
    { timeoutMs = 60_000 }: { timeoutMs?: number } = {}
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      void this.authHeaders()
        .then((auth) => {
          const url = new URL(path, this.config.bridgeUrl);
          const isHttps = url.protocol === 'https:';
          const payload = body === undefined ? undefined : JSON.stringify(body);
          const req = (isHttps ? https : http).request(
            url,
            {
              method,
              headers: {
                'content-type': 'application/json',
                ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
                ...auth,
              },
              timeout: timeoutMs,
            },
            (res) => {
              let data = '';
              res.on('data', (c) => (data += c));
              res.on('end', () => {
                const status = res.statusCode ?? 0;
                if (status >= 200 && status < 300) {
                  try {
                    resolve((data ? JSON.parse(data) : {}) as T);
                  } catch {
                    resolve({} as T);
                  }
                } else {
                  reject(new Error(`bridge ${method} ${path} failed (${status}): ${data}`));
                }
              });
            }
          );
          req.on('timeout', () => req.destroy(new Error(`bridge ${method} ${path} timed out`)));
          req.on('error', reject);
          if (payload) req.write(payload);
          req.end();
        })
        .catch(reject);
    });
  }

  async health(): Promise<{ ok: boolean; sandboxTool?: boolean; version?: string }> {
    // /healthz is reserved by the Cloud Run GFE; the bridge exposes /status.
    return this.request('GET', '/status', undefined, { timeoutMs: 20_000 });
  }

  async createSandbox(name: string): Promise<void> {
    await this.request('POST', '/sandboxes', { name }, { timeoutMs: 90_000 });
  }

  async deleteSandbox(name: string): Promise<void> {
    await this.request('DELETE', `/sandboxes/${encodeURIComponent(name)}`, undefined, {
      timeoutMs: 30_000,
    }).catch((e) => this.logger.warn(`bridge delete ${name} failed: ${(e as Error).message}`));
  }

  async putFiles(name: string, files: Array<{ path: string; contents: string }>): Promise<void> {
    await this.request('POST', `/sandboxes/${encodeURIComponent(name)}/files`, { files });
  }

  async exec(
    name: string,
    command: string,
    { timeoutMs = 60_000 }: { timeoutMs?: number } = {}
  ): Promise<SandboxExecResult> {
    return this.request(
      'POST',
      `/sandboxes/${encodeURIComponent(name)}/exec`,
      { command, timeoutMs },
      { timeoutMs: timeoutMs + 5_000 }
    );
  }

  /**
   * Open a stdio channel to `sandbox exec <name> -- <argv>` over a WebSocket.
   * Returns a ChildProcess-like object exposing stdin/stdout/stderr + kill(), so
   * the OpenCode ACP runtime can drive it exactly like a local `kubectl exec`.
   *
   * Synchronous return (matching the `Sandbox.spawn` contract): the child
   * buffers stdin while the auth token is minted and the WS connects.
   */
  spawn(name: string, argv: string[]): BridgeChildProcess {
    const url = new URL(`/sandboxes/${encodeURIComponent(name)}/spawn`, this.config.bridgeUrl);
    url.searchParams.set('argv', JSON.stringify(argv));
    return new BridgeChildProcess(url, () => this.authHeaders(), this.logger);
  }
}
