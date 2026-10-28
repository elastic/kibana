/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type UserPrincipalType = 'user' | 'service_account';

export interface UserIdAndName {
  /** profile UUID, or a synthetic stable id for principals without a user profile */
  id?: string;
  /** username */
  username: string;
  /** Absent means `'user'`. */
  type?: UserPrincipalType;
}

// Stable ids for principals without a user profile. No commas: `bulkGet` joins uids into one list.
export const SERVICE_ACCOUNT_ID_PREFIX = 'service_account:';
export const REALM_USER_ID_PREFIX = 'realm:';

export const serviceAccountUserId = (serviceAccountId: string) =>
  `${SERVICE_ACCOUNT_ID_PREFIX}${serviceAccountId}`;

// `bulkGet` resolves a batch as one unit: one synthetic id would drop every real user's profile in it.
export const isUserProfileId = (id: string | undefined): id is string =>
  id !== undefined &&
  !id.startsWith(SERVICE_ACCOUNT_ID_PREFIX) &&
  !id.startsWith(REALM_USER_ID_PREFIX);

/**
 * Identity of the authenticated requester used in authorization decisions.
 *
 * Distinguished from {@link UserIdAndName} (which is a generic user reference, e.g. an
 * agent's stored `created_by` snapshot) so call sites can document intent: a parameter
 * typed `CurrentUser` carries the request's identity and authorization context, not an arbitrary
 * persisted reference.
 */
export interface CurrentUser extends UserIdAndName {
  isAdmin: boolean;
  canManageSecurity?: boolean;
}
