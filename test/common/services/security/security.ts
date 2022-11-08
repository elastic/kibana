/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Role } from './role';
import { User } from './user';
import { RoleMappings } from './role_mappings';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createTestUserService, TestUserSupertestProvider, TestUser } from './test_user';
import { createSystemIndicesUser } from './system_indices_user';

export class SecurityService {
  constructor(
    public readonly roleMappings: RoleMappings,
    public readonly testUser: TestUser,
    public readonly role: Role,
    public readonly user: User,
    public readonly testUserSupertest: ReturnType<typeof TestUserSupertestProvider>
  ) {}
}

export async function SecurityServiceProvider(ctx: FtrProviderContext) {
  const log = ctx.getService('log');
  const kibanaServer = ctx.getService('kibanaServer');

  const role = new Role(log, kibanaServer);
  const user = new User(log, kibanaServer);
  await createSystemIndicesUser(ctx);
  const testUser = await createTestUserService(ctx, role, user);
  const testUserSupertest = TestUserSupertestProvider(ctx);
  const roleMappings = new RoleMappings(log, kibanaServer);

  return new SecurityService(roleMappings, testUser, role, user, testUserSupertest);
}
