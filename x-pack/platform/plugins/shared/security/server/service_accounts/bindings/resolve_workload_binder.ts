/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { getAuthenticatedPrincipal } from '@kbn/core-security-common';
import type { ServiceAccountWorkloadBinder } from '@kbn/core-security-server';

import type { AuthenticatedUser } from '../../../common';
import { getDetailedErrorMessage } from '../../errors';

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
 *
 * Unlike {@link getAuthenticatedPrincipal}, which classifies anonymous callers as `anonymous`
 * whatever credential the anonymous provider authenticates with, an anonymous caller that acted
 * through an API key is recorded as that key.
 */
export const resolveWorkloadBinder = async (
  user: AuthenticatedUser,
  resolveUserProfileId: ResolveUserProfileId
): Promise<ServiceAccountWorkloadBinder> => {
  const principal = getAuthenticatedPrincipal(user);

  switch (principal.type) {
    case 'service_account':
      return { type: 'service_account', serviceAccountId: principal.serviceAccountId };

    case 'api_key':
      return await toApiKeyBinder(principal.apiKeyId, principal.variant, resolveUserProfileId);

    case 'user':
      return {
        type: 'user',
        username: principal.username,
        ...optionalUserProfileId(principal.userProfileId ?? (await resolveUserProfileId())),
      };

    case 'anonymous':
      // The persisted binder has no anonymous arm; authorization decides whether anonymous
      // callers may bind at all, so record them the way they were recorded before.
      if (user.api_key) {
        return await toApiKeyBinder(
          user.api_key.id,
          user.api_key.managed_by === 'cloud' ? 'uiam' : 'stack',
          resolveUserProfileId
        );
      }
      return {
        type: 'user',
        username: principal.username,
        ...optionalUserProfileId(await resolveUserProfileId()),
      };
  }
};

const toApiKeyBinder = async (
  apiKeyId: string,
  variant: 'stack' | 'uiam',
  resolveUserProfileId: ResolveUserProfileId
): Promise<ServiceAccountWorkloadBinder> => ({
  type: 'api_key',
  apiKeyId,
  variant,
  // TODO: record the creator's user profile for UIAM API keys too, once fake requests can
  // resolve user profiles: https://github.com/elastic/kibana/issues/271760
  ...(variant === 'stack' ? optionalUserProfileId(await resolveUserProfileId()) : {}),
});

const optionalUserProfileId = (userProfileId: string | undefined) =>
  userProfileId ? { userProfileId } : {};
