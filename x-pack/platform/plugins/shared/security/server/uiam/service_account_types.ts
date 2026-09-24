/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * UIAM's own wire shapes for a service account. Private to the security plugin: the
 * `ServiceAccount` that Core exposes is backend-agnostic, and these describe one particular
 * backend's payloads. Fields stay snake_case so they mirror the upstream API verbatim.
 */

/**
 * Identifies a principal that is allowed to exchange a service account's credentials for an
 * access token.
 */
export type ServiceAccountAssumableBy =
  | {
      type: 'project-service-account';
      organization_id: string;
      project_type: string;
      project_id: string;
    }
  | {
      type: 'platform-service-account';
      service_account_id: string;
    };

/**
 * Roles granted to a service account, as resolved by UIAM and reported on a service account.
 * Creating one does not take role assignments: UIAM's first iteration grants the service account
 * the privileges of its creator, minus any control plane privileges, so there is nothing for a
 * caller to choose.
 *
 * TODO(https://github.com/elastic/kibana/issues/284463): modelled loosely because the upstream
 * API specification does not pin the structure down; tighten it once it does.
 */
export type ServiceAccountRoleAssignments = Record<string, unknown>;

/**
 * A service account as UIAM reports it. Narrowed to Core's backend-agnostic `ServiceAccount`
 * before it leaves the plugin.
 */
export interface UiamServiceAccount {
  id: string;
  type: 'project';
  name: string;
  organization_id: string;
  role_assignments: ServiceAccountRoleAssignments;
  assumable_by: ServiceAccountAssumableBy[];
}

/**
 * The principal UIAM records as an account's creator. A user is identified by the numeric id that
 * is also their Kibana username on serverless.
 */
export type UiamServiceAccountCreator =
  | {
      type: 'user';
      id: string;
      first_name?: string;
      last_name?: string;
    }
  | {
      type: 'api-key';
      id: string;
      description?: string;
    };

/**
 * A service account as UIAM reports it from get and list, which add `creator` to what create
 * returns.
 */
export interface UiamServiceAccountDetails extends UiamServiceAccount {
  creator: UiamServiceAccountCreator;
}

/**
 * One page of UIAM's list. `next_page` is the last id on the page and is only present when more
 * results remain; it goes back to UIAM as `after`.
 */
export interface UiamListServiceAccountsResponse {
  service_accounts: UiamServiceAccountDetails[];
  next_page?: string;
}
