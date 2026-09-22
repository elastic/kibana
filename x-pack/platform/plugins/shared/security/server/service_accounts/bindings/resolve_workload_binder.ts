/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-server';

import type { AuthenticatedUser } from '../../../common';
import { getDetailedErrorMessage } from '../../errors';

/** Elasticsearch's realm for its own service accounts. */
const SERVICE_ACCOUNT_REALM_TYPE = '_service_account';

/**
 * Resolves the user profile behind the acting request. Invoked lazily, and only when the binder
 * is a kind that has a user behind it — for an API key that means a lookup of the key's creator.
 */
export type ResolveUserProfileId = () => Promise<string | undefined>;

/**
 * Builds the lookup above so that it resolves `undefined` instead of rejecting. Attribution is
 * worth an extra lookup, but never worth failing an operation the caller is otherwise entitled
 * to perform, and the lookup reaches Elasticsearch on most of its paths.
 */
export const bestEffortUserProfileIdResolver =
  (
    getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>,
    request: KibanaRequest,
    logger: Logger
  ): ResolveUserProfileId =>
  async () => {
    try {
      return (await getCurrentUserProfileId(request)) ?? undefined;
    } catch (e) {
      logger.debug(
        `Could not resolve a user profile for the principal acting on a service account: ${getDetailedErrorMessage(
          e
        )}`
      );
      return undefined;
    }
  };

/**
 * Records the most specific stable identifier for the principal that created the binding, so the
 * attribution survives the acting principal being renamed, or the user leaving the organization.
 *
 * Machine identities win over credentials, and credentials over the user behind them: a request
 * authenticated with an API key acted as that key, which carries its own privileges and outlives
 * any single session. The user profile is recorded alongside the credential where one exists, so
 * a binding can still be traced back to a person.
 */
export const resolveWorkloadBinder = async (
  user: AuthenticatedUser,
  resolveUserProfileId: ResolveUserProfileId
): Promise<ServiceAccountWorkloadBinder> => {
  if (user.authentication_realm?.type === SERVICE_ACCOUNT_REALM_TYPE) {
    return { type: 'service_account', serviceAccountId: user.username };
  }

  if (user.api_key) {
    const variant = user.api_key.managed_by === 'cloud' ? 'uiam' : 'stack';
    // TODO: record the creator's user profile for UIAM API keys too, once fake requests can
    // resolve user profiles: https://github.com/elastic/kibana/issues/271760
    return {
      type: 'api_key',
      apiKeyId: user.api_key.id,
      variant,
      ...(variant === 'stack' ? optionalUserProfileId(await resolveUserProfileId()) : {}),
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
