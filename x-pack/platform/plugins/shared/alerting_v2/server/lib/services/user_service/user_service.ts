/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { suggestUserProfilesResponseSchema } from '@kbn/alerting-v2-schemas';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UserProfile } from '@kbn/core-user-profile-common';
import type {
  UserProfileServiceStart,
  UserProfileSuggestParams,
} from '@kbn/core-user-profile-server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';

/**
 * Standardized user-suggestion response shared with the API contract: safe user
 * fields plus an optional avatar (with Core's `imageUrl` renamed to `image_url`).
 */
export type SuggestUsersResponse = z.infer<typeof suggestUserProfilesResponseSchema>;

/**
 * Maps Core user profiles to the standardized suggestion response: picks the
 * safe user fields and, when present, the avatar — renaming Core's `imageUrl`
 * to the API contract's `image_url`.
 */
export const toSuggestUsersResponse = (profiles: UserProfile[]): SuggestUsersResponse =>
  profiles.map(({ uid, user, data }) => ({
    uid,
    user: {
      username: user.username,
      full_name: user.full_name,
      email: user.email,
    },
    ...(data?.avatar && {
      avatar: {
        initials: data.avatar.initials,
        color: data.avatar.color,
        image_url: data.avatar.imageUrl,
      },
    }),
  }));

/**
 * Identity performing a write, persisted in the `createdBy` / `updatedBy`
 * saved object attributes. A `null` `profile_uid` means a user made the write
 * but their profile could not be resolved, which is distinct from a `null`
 * actor, meaning there was no user at all.
 */
export interface Actor {
  profile_uid: string | null;
}

export interface UserServiceContract {
  getCurrentUserProfileUid(): Promise<string | null>;
  getCurrentActor(): Promise<Actor | null>;
  suggestUsers(params: UserProfileSuggestParams): Promise<SuggestUsersResponse>;
}

@injectable()
export class UserService implements UserServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart,
    @inject(CoreStart('security'))
    private readonly security: SecurityServiceStart
  ) {}

  public async getCurrentUserProfileUid(): Promise<string | null> {
    return this.userProfile.getCurrentProfileId({ request: this.request });
  }

  /**
   * Resolves the current user as a saved object actor.
   *
   * A profile can be unavailable for several reasons: an unactivated profile,
   * an API key without one, security disabled.
   */
  public async getCurrentActor(): Promise<Actor | null> {
    const profileUid = await this.userProfile.getCurrentProfileId({ request: this.request });

    if (profileUid) {
      return { profile_uid: profileUid };
    }

    return this.security.authc.getCurrentUser(this.request) ? { profile_uid: null } : null;
  }

  /**
   * Suggests user profiles by search criteria via Core's user-profile service,
   * returning the standardized suggestion response.
   */
  public async suggestUsers(params: UserProfileSuggestParams): Promise<SuggestUsersResponse> {
    const profiles = await this.userProfile.suggest(params);
    return toSuggestUsersResponse(profiles);
  }
}
