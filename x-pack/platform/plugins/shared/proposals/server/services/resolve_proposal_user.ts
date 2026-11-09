/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalUser } from '@kbn/proposals-common';

export type ResolveProposalUser = (request: KibanaRequest) => Promise<ProposalUser | undefined>;

/**
 * Resolves who is acting, preferring the user profile because its uid is the
 * stable identity a UI resolves an avatar from.
 *
 * Three tiers. The first two exist for the same reason Cases has two: the
 * profile service returns nothing for an anonymous user, a `run-as` proxy, a
 * session without a profile, or an API key whose creator has no activated
 * profile — and the resume path here runs under exactly such an API key.
 * Falling back to `authc` still yields a username, so attribution degrades
 * rather than disappearing.
 *
 * The third is a service account, which stores no user at all: neither the
 * profile service nor `getCurrentUser` resolves anything for its request, so
 * the principal is the only source of its id. It matters here because an agent
 * running as a service account creates to-dos directly, with no gate step to
 * resolve the Worker for it — without this they would be stored with no
 * creator. A step still prefers `resolveWorkerUser`, which names the Worker
 * behind the account; this is the plain account id underneath it.
 */
export const createProposalUserResolver =
  ({
    userProfile,
    security,
    logger,
  }: Pick<CoreStart, 'userProfile' | 'security'> & { logger: Logger }): ResolveProposalUser =>
  async (request) => {
    try {
      const profile = await userProfile.getCurrent({ request });
      if (profile) {
        return {
          username: profile.user.username,
          fullName: profile.user.full_name ?? null,
          email: profile.user.email ?? null,
          profileUid: profile.uid,
        };
      }
    } catch (error) {
      logger.debug(
        `Failed to resolve the user profile, falling back to authc: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    const user = security.authc.getCurrentUser(request);
    if (!user) {
      const principal = security.authc.getPrincipal(request);
      return principal?.type === 'service_account'
        ? { username: principal.serviceAccountId, fullName: null, email: null }
        : undefined;
    }

    return {
      username: user.username,
      fullName: user.full_name ?? null,
      email: user.email ?? null,
      // Present when the authenticating layer already bound it; absent for most
      // API-key requests, which is why the names above are stored rather than
      // looked up later.
      ...(user.profile_uid ? { profileUid: user.profile_uid } : {}),
    };
  };
