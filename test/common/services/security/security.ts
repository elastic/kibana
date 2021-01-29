/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Role } from './role';
import { User } from './user';
import { RoleMappings } from './role_mappings';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createTestUserService, TestUserSupertestProvider } from './test_user';

export async function SecurityServiceProvider(context: FtrProviderContext) {
  const { getService } = context;
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  const role = new Role(log, kibanaServer);
  const user = new User(log, kibanaServer);
  const testUser = await createTestUserService(role, user, context);
  const testUserSupertest = TestUserSupertestProvider(context);

  return new (class SecurityService {
    roleMappings = new RoleMappings(log, kibanaServer);
    testUser = testUser;
    role = role;
    user = user;
    testUserSupertest = testUserSupertest;
  })();
}
