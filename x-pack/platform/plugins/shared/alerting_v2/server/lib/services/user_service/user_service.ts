/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';

/**
 * Actor persisted in the `createdBy` / `updatedBy` saved object attributes.
 * Derived from the stored shape so the two cannot drift.
 */
export type Actor = NonNullable<RuleSavedObjectAttributes['createdBy']>;

export interface UserServiceContract {
  getCurrentUserProfileUid(): Promise<string | null>;
  getCurrentActor(): Promise<Actor | null>;
}

@injectable()
export class UserService implements UserServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart
  ) {}

  public async getCurrentUserProfileUid(): Promise<string | null> {
    return this.userProfile.getCurrentProfileId({ request: this.request });
  }

  /**
   * Resolves the current user as a saved object actor. Returns `null` when the
   * request has no user profile (an unactivated profile, or a non-user request
   * such as an API key).
   */
  public async getCurrentActor(): Promise<Actor | null> {
    const profileUid = await this.userProfile.getCurrentProfileId({ request: this.request });

    return profileUid ? { profile_uid: profileUid } : null;
  }
}
