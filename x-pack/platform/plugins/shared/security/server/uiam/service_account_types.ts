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
 * One project-scoped role assignment. `role_id` names a Cloud role; for service accounts Kibana
 * only ever sends `<projectType>-application-only`, the role UIAM defines as carrying no
 * control-plane privileges, so that the account's privileges are exactly its `application_roles`.
 * Scope is either every project in the organization (`all: true`) or the listed `project_ids`.
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
 * on one. Only the project section is modelled, keyed by project type: it is the one Kibana
 * writes and the one it reads back for display. The other sections (organization, deployment,
 * platform, and so on) are not something a Kibana-created account carries.
 *
 * On create, UIAM stores these as the account's roles and records the creator's own role
 * assignments as the account's `limited_by`. At runtime UIAM and Elasticsearch authorize against
 * both, so the account's effective privileges are the intersection. UIAM also accepts a
 * `{ limit: { access, resource } }` request instead, meaning "the creator's own application
 * privileges with no ceiling"; Kibana no longer sends that, since every account is created with
 * explicit roles.
 */
export interface UiamRoleAssignments {
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
  /** The creator's role assignments, recorded as a ceiling. Absent for accounts created before downscoping existed. */
  limited_by?: UiamRoleAssignments;
  assumable_by: ServiceAccountAssumableBy[];
}
