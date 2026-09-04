/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountWorkloadAttacher } from '@kbn/core-security-server';

import type { AuthenticatedUser } from '../../../common';

/** Elasticsearch's realm for its own service accounts. */
const SERVICE_ACCOUNT_REALM_TYPE = '_service_account';

/**
 * Resolves the user profile behind the acting request. Invoked lazily, and only when the attacher
 * is a kind that has a user behind it — for an API key that means a lookup of the key's creator.
 */
export type ResolveUserProfileId = () => Promise<string | undefined>;

/**
 * Records the most specific stable identifier for whatever actually attached a binding, so the
 * attribution survives the acting principal being renamed, or the user leaving the organization.
 *
 * Machine identities win over credentials, and credentials over the user behind them: a request
 * authenticated with an API key acted as that key, which carries its own privileges and outlives
 * any single session. The user profile is recorded alongside the credential where one exists, so
 * a binding can still be traced back to a person.
 */
export const resolveWorkloadAttacher = async (
  user: AuthenticatedUser,
  resolveUserProfileId: ResolveUserProfileId
): Promise<ServiceAccountWorkloadAttacher> => {
  if (user.authentication_realm?.type === SERVICE_ACCOUNT_REALM_TYPE) {
    return { type: 'service_account', serviceAccountId: user.username };
  }

  if (user.api_key) {
    return {
      type: 'api_key',
      apiKeyId: user.api_key.id,
      variant: user.api_key.managed_by === 'cloud' ? 'uiam' : 'stack',
      ...optionalUserProfileId(await resolveUserProfileId()),
    };
  }

  return {
    type: 'user',
    username: user.username,
    ...optionalUserProfileId(user.profile_uid ?? (await resolveUserProfileId())),
  };
};

const optionalUserProfileId = (userProfileId: string | undefined) =>
  userProfileId ? { userProfileId } : {};
