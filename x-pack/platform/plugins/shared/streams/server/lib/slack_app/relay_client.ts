/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RelayRequestError } from './relay_error';

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Request/response contracts mirror relay-service `src/contracts/http/slack.ts`
 * (see relay-service#78). Deployment identity is asserted at the transport layer
 * (mTLS proxy, XFCC header) and is never part of the request body.
 */
export interface RelayInstallRequest {
  /**
   * The Kibana-minted managed ES API key (base64 `id:api_key`, min 32 chars) the
   * Relay stores and presents to Agent Builder. The caller owns this credential;
   * the Relay never mints one. Field name per the merged contract (relay-service
   * commit ff5d067, `StartInstallRequest`).
   */
  kibana_api_key: string;
  /** Optional audit marker for who initiated the install. */
  created_by_user_key?: string;
}

export interface RelayInstallResponse {
  authorize_url: string;
  state: string;
  claim_id: string;
  deployment_ref: string;
}

export type RelayClaimResponse =
  | { status: 'pending' }
  | { status: 'complete'; deployment_ref: string };

/**
 * Thin HTTP client for the Nightshift Relay service. Kibana -> Relay transport runs
 * through the deployment's mTLS proxy (identity via XFCC), configured at the infra
 * layer; `relayUrl` is the operator-configured base URL. Not user-supplied, so this
 * is not an SSRF vector.
 */
export class RelayClient {
  constructor(private readonly relayUrl: string) {}

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const { response } = await this.post('/v1/slack/install', body);
    return (await response.json()) as RelayInstallResponse;
  }

  /**
   * Completion poll. `claim_id` (issued by the install start) is required in the
   * body (`parseClaimInstallInput` on relay main); XFCC identity verifies the
   * caller owns the claim. 202 while the Slack OAuth consent is outstanding,
   * 200 with the deployment ref once fulfilled. No secret is ever returned.
   */
  async fetchClaim(claimId: string): Promise<RelayClaimResponse> {
    const { response } = await this.post('/v1/slack/install/claim', { claim_id: claimId });
    if (response.status === 202) {
      return { status: 'pending' };
    }
    const { deployment_ref: deploymentRef } = (await response.json()) as {
      deployment_ref: string;
    };
    return { status: 'complete', deployment_ref: deploymentRef };
  }

  /** Unbind on disconnect. Not yet implemented Relay-side; tracked as a follow-up. */
  async unbind(): Promise<void> {
    await this.post('/v1/slack/uninstall', {});
  }

  private async post(path: string, body: unknown): Promise<{ response: Response }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(new URL(path, this.relayUrl), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Relay error bodies carry `{ message }` (e.g. "workspace already bound");
        // preserve it so callers can surface the actual reason.
        let relayMessage: string | undefined;
        try {
          relayMessage = ((await response.json()) as { message?: string }).message;
        } catch {
          // Non-JSON error body; the status code is all we have.
        }
        throw new RelayRequestError(path, response.status, relayMessage);
      }
      return { response };
    } catch (error) {
      // Logging is owned by callers: they know whether a failure is expected
      // (uninstall 404), transient (keep polling), or terminal (surface to user).
      throw error instanceof Error ? error : new Error(`Relay request to ${path} failed`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
