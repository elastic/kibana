/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A person, or a machine identity such as an Elasticsearch service account. */
export type UserPrincipalType = 'user' | 'service_account';

export interface UserIdAndName {
  /** profile UUID, or a synthetic stable id for principals without a user profile */
  id?: string;
  /** username */
  username: string;
  /** The kind of principal. Treat an absent value as `'user'`. */
  type?: UserPrincipalType;
}

/**
 * Prefixes of the synthetic stable ids given to principals without a user profile. They keep such
 * ids distinguishable from profile uids, and contain no comma so they survive uid batching.
 */
export const SERVICE_ACCOUNT_ID_PREFIX = 'service_account:';
export const REALM_USER_ID_PREFIX = 'realm:';

/**
 * Whether `id` is a user profile uid rather than a synthetic id for a principal without a profile.
 * Never pass a synthetic id to `userProfile.bulkGet`: the batch resolves as a unit, so one
 * unresolvable uid drops the profiles of every real user in it.
 */
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
}
