/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamProjectType } from '@kbn/core-security-server';

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
 * One organization-scoped role assignment. `role_id` names a Cloud role. For service accounts,
 * Kibana only ever sends `organization-application-only`, the role UIAM defines as carrying no
 * control-plane privileges, so the account's privileges are exactly its `application_roles` on
 * every project in the organization.
 */
export interface UiamOrganizationRoleAssignment {
  role_id: string;
  organization_id: string;
  application_roles?: string[];
}

/**
 * One project-scoped role assignment. Kibana does not send these, but UIAM reports them on
 * accounts created before the organization-wide role existed.
 * Scope is either every project of that type in the organization (`all: true`) or the listed `project_ids`.
 */
export interface UiamProjectRoleAssignment {
  role_id: string;
  organization_id: string;
  all: boolean;
  project_ids?: string[];
  application_roles?: string[];
}

/**
 * Role assignments as Kibana sends them when creating a service account and as UIAM reports them
 * on one. Only the organization and project sections are modelled. Kibana writes the
 * organization section, and accounts created before Kibana did so may carry the project section. The other
 * sections (deployment, platform, and so on) are not something a Kibana-created account carries.
 *
 * On create, UIAM stores these as the account's roles and records the creator's own role
 * assignments as the account's `limited_by`. UIAM reports that ceiling only when the account's
 * token is authenticated, never on the account itself. At runtime UIAM and Elasticsearch authorize against
 * both, so the account's effective privileges are the intersection. UIAM also accepts a
 * `{ limit: { access, resource } }` request instead, meaning "the creator's own application
 * privileges with no ceiling". Kibana does not send this, as it requires the account to have explicit roles.
 */
export interface UiamRoleAssignments {
  organization?: UiamOrganizationRoleAssignment[];
  project?: Partial<Record<UiamProjectType, UiamProjectRoleAssignment[]>>;
}

/**
 * A service account as UIAM reports it. Narrowed to Core's backend-agnostic `ServiceAccount`
 * before it leaves the plugin.
 */
export interface UiamServiceAccount {
  id: string;
  type: 'project';
  name: string;
  organization_id: string;
  role_assignments: UiamRoleAssignments;
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
