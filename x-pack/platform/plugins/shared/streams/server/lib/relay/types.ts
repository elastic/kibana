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
  kibana_api_key: string;
  created_by_user_key?: string;
}

export interface StartInstallResponseBody {
  authorize_url: string;
  state: string;
  claim_id: string;
  deployment_ref: string;
}

/**
 * `BindingScope` mirrors the relay-service's discriminated union of the same
 * name; it is identical on the wire and in the domain model, so it is not
 * duplicated per-layer like the other types below.
 */
export type BindingScope =
  | { type: 'DEFAULT' }
  | { type: 'SUB'; id: string }
  | { type: 'USER'; id: string };

export interface TenantViewBody {
  surface: string;
  tenant_key: string;
  deployment_ref: string;
  status: string;
}

export interface BindingViewBody {
  surface: string;
  tenant_key: string;
  scope: BindingScope;
  deployment_ref: string;
}

export interface TenantsResponseBody {
  items: TenantViewBody[];
  next_cursor?: string;
}

export interface BindingsResponseBody {
  items: BindingViewBody[];
  next_cursor?: string;
}

/**
 * Outbound TLS settings for the `fetch` connection to the relay-service (client
 * certificate for mTLS, a custom CA, etc). Field names mirror
 * `xpack.security.uiam.ssl` for consistency with Kibana's other `fetch`-based
 * outbound clients. All fields are file paths, read at client construction time.
 */
export interface RelayClientTlsOptions {
  verificationMode: 'none' | 'certificate' | 'full';
  certificateAuthorities?: string | string[];
  certificate?: string;
  key?: string;
}

export interface StartSlackInstallInput {
  kibanaApiKey: string;
  createdByUserKey?: string;
}

/** `cursor` is the opaque `next_cursor` returned by a previous page. */
export interface ListPageInput {
  limit?: number;
  cursor?: string;
}

export interface RelayClient {
  startSlackInstall(input: StartSlackInstallInput): Promise<StartInstallResponseBody>;
  listTenants(input?: ListPageInput): Promise<TenantsResponseBody>;
  listBindings(input?: ListPageInput): Promise<BindingsResponseBody>;
}
