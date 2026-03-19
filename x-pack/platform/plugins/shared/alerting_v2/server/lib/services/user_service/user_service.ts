/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { inject, injectable } from 'inversify';
import { CoreStart, Request } from '@kbn/core-di-server';

export interface UserServiceContract {
  getCurrentUserProfileUid(): Promise<string | null>;
  getCurrentUsername(): Promise<string | null>;
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
    try {
      const profile = await this.userProfile.getCurrent({ request: this.request });
      return profile?.uid ?? null;
    } catch {
      return null;
    }
  }

  public async getCurrentUsername(): Promise<string | null> {
    try {
      const profile = await this.userProfile.getCurrent({ request: this.request });
      return profile?.user.username ?? null;
    } catch {
      // User profile may not be available (e.g. API key auth from agent builder).
      // Fall back to the security service which works with all authentication types.
      return this.security.authc.getCurrentUser(this.request)?.username ?? null;
    }
  }
}
