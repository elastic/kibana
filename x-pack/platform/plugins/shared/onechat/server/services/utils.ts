/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

export const getUserFromRequest = (request: KibanaRequest, security: SecurityServiceStart) => {
  const authUser = security.authc.getCurrentUser(request);
  const user = authUser
    ? { id: authUser.profile_uid!, username: authUser.username }
    : { id: 'anonymous', username: 'anonymous' };
  return user;
};
