/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wire types mirror the relay-service HTTP contract (snake_case). See
 * `src/contracts/http/slack.ts` in github.com/elastic/relay-service.
 */
export interface StartInstallRequestBody {
  // Encoded Kibana API key the relay stores and later uses to call Agent Builder
  // on this deployment. Must be at least 32 chars (enforced by the relay).
  deployment_token: string;
  created_by_user_key?: string;
}

export interface StartInstallResponseBody {
  authorize_url: string;
  state: string;
  claim_id: string;
  deployment_ref: string;
}

/**
 * Domain types (camelCase) are what the rest of Kibana consumes. For the
 * initiate-only scope we only surface the authorize URL.
 */
export interface StartSlackInstallInput {
  deploymentToken: string;
  createdByUserKey?: string;
}

export interface StartSlackInstallResult {
  authorizeUrl: string;
}

export interface RelayClient {
  startSlackInstall(input: StartSlackInstallInput): Promise<StartSlackInstallResult>;
}
