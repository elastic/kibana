/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken, type ServiceToken } from '@kbn/core-di';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';

/**
 * The caller's profile-scoped user storage client, or `null` when the request carries no user
 * profile (API keys). Bound in the request scope only.
 */
export const ScopedUserStorage: ServiceToken<IUserStorageClient | null> =
  createToken('ScopedUserStorage');
