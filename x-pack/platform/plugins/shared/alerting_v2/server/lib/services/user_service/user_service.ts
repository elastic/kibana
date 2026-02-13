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

export interface UserServiceContract {
  getCurrentUserProfileUid(): Promise<string | null>;
}

@injectable()
export class UserService implements UserServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(CoreStart('userProfile'))
    private readonly userProfile: UserProfileServiceStart
  ) {}

  public async getCurrentUserProfileUid(): Promise<string | null> {
    const profile = await this.userProfile.getCurrent({ request: this.request });
    return profile?.uid ?? null;
  }
}
