/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticationProvider } from '@kbn/security-plugin-types-common';

export interface SessionInfo {
  expiresInMs: number | null;
  canBeExtended: boolean;
  provider: AuthenticationProvider;
}

export enum LogoutReason {
  'SESSION_EXPIRED' = 'SESSION_EXPIRED',
  'CONCURRENCY_LIMIT' = 'CONCURRENCY_LIMIT',
  'AUTHENTICATION_ERROR' = 'AUTHENTICATION_ERROR',
  'LOGGED_OUT' = 'LOGGED_OUT',
  'UNAUTHENTICATED' = 'UNAUTHENTICATED',
}

export interface SecurityCheckupState {
  displayAlert: boolean;
}
