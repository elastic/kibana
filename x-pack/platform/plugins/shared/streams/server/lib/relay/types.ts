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
  ok: true;
  tenants: TenantViewBody[];
  next_cursor?: string;
}

export interface BindingsResponseBody {
  ok: true;
  bindings: BindingViewBody[];
  next_cursor?: string;
}

/**
 * Domain types (camelCase) are what the rest of Kibana consumes. For the
 * initiate-only scope we only surface the authorize URL.
 */
export interface StartSlackInstallInput {
  kibanaApiKey: string;
  createdByUserKey?: string;
}

export interface StartSlackInstallResult {
  authorizeUrl: string;
}

/** `cursor` is the opaque `next_cursor` returned by a previous page. */
export interface ListPageInput {
  limit?: number;
  cursor?: string;
}

export interface Tenant {
  surface: string;
  tenantKey: string;
  deploymentRef: string;
  status: string;
}

export interface Binding {
  surface: string;
  tenantKey: string;
  scope: BindingScope;
  deploymentRef: string;
}

export interface ListTenantsResult {
  tenants: Tenant[];
  nextCursor?: string;
}

export interface ListBindingsResult {
  bindings: Binding[];
  nextCursor?: string;
}

export interface RelayClient {
  startSlackInstall(input: StartSlackInstallInput): Promise<StartSlackInstallResult>;
  listTenants(input?: ListPageInput): Promise<ListTenantsResult>;
  listBindings(input?: ListPageInput): Promise<ListBindingsResult>;
}
