/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityServiceStart } from '@kbn/core/public';

export const getUserEmail = async (security: SecurityServiceStart) => {
  try {
    const user = await security.authc.getCurrentUser();
    return user?.email;
  } catch {
    return undefined;
  }
};
