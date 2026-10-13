/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';

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
}
