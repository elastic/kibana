/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import constate from 'constate';

import type { UserProfileAPIClient } from '../account_management';
import type { UserAPIClient } from '../management';

/**
 * Represents a collection of the high-level abstractions (clients) to interact with the Security specific APIs.
 */
export interface SecurityApiClients {
  userProfiles: UserProfileAPIClient;
  users: UserAPIClient;
}

/**
 * The `SecurityApiClientsProvider` React context provider is used to provide UI components with the Security API
 * clients that can be subsequently consumed through `useSecurityApiClients` hook.
 */
export const [SecurityApiClientsProvider, useSecurityApiClients] = constate(
  ({ userProfiles, users }: SecurityApiClients) => ({
    userProfiles,
    users,
  })
);
