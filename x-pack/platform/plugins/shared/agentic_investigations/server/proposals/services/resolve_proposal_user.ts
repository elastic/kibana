/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalUser } from '../../../common/proposals/proposal';

export type ResolveProposalUser = (request: KibanaRequest) => Promise<ProposalUser | undefined>;

/**
 * Resolves who is acting, preferring the user profile because its uid is the
 * stable identity a UI resolves an avatar from.
 *
 * Two tiers, for the same reason Cases has two: the profile service returns
 * nothing for an anonymous user, a `run-as` proxy, a session without a profile,
 * or an API key whose creator has no activated profile — and the resume path
 * here runs under exactly such an API key. Falling back to `authc` still yields
 * a username, so attribution degrades rather than disappearing.
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
      return undefined;
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
