/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { inject, injectable, optional } from 'inversify';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';

export interface UserServiceContract {
  getCurrentUserProfileUid(): string | null;
}

@injectable()
export class UserService implements UserServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  public getCurrentUserProfileUid(): string | null {
    return this.security?.authc.getCurrentUser(this.request)?.profile_uid ?? null;
  }
}
