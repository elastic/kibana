/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, KibanaRequest } from '@kbn/core/server';

export async function getCurrentUser(core: CoreStart, request: KibanaRequest) {
  const currentUser = core.security.authc.getCurrentUser(request);

  if (!currentUser) {
    throw new Error('Could not resolve current user');
  }

  return currentUser.username;
}
