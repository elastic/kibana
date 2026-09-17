/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAccessControlSchema } from '@kbn/entity-access-control';
import type { AccessControl } from '@kbn/entity-access-control';
import type { UserProfile } from '@kbn/core-user-profile-common';

/**
 * The roles a connector can grant. Executors can view and run the connector but cannot change its
 * configuration, secrets or access. Everything else is reserved to the owner.
 */
export const CONNECTOR_ACCESS_ROLES = ['executor'] as const;

export type ConnectorAccessRole = (typeof CONNECTOR_ACCESS_ROLES)[number];

export const connectorAccessControlSchema = createAccessControlSchema(CONNECTOR_ACCESS_ROLES);

export const CONNECTOR_ACCESS_CONTROL_API_PATH = '/internal/actions/connector/{id}/access_control';

/** What the current user may do with a connector, after space and feature privileges are applied. */
export interface ConnectorAccessPermissions {
  read: boolean;
  execute: boolean;
  edit: boolean;
  manage: boolean;
}

/** Structurally compatible with `UserProfileWithAvatar` from `@kbn/user-profile-components`. */
export type ConnectorAccessUserProfile = UserProfile<{
  avatar?: { initials?: string | null; color?: string | null; imageUrl?: string | null };
}>;

export interface ConnectorAccessResponse {
  permissions: ConnectorAccessPermissions;
  /** The current owner of the connector, if it has one. Only returned to users that can manage it. */
  owner?: string;
  /** The current access control of the connector. Only returned to users that can manage it. */
  access_control?: AccessControl<ConnectorAccessRole>;
}

/** The access control of a connector plus the profiles needed to render the owner and entries. */
export interface ConnectorAccessControlApiResponse extends ConnectorAccessResponse {
  profiles: ConnectorAccessUserProfile[];
  current_user_profile_id?: string;
}
