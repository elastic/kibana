/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SessionExpired } from './session_expired';

export function createSessionExpiredMock() {
  return {
    logout: jest.fn(),
  } as jest.Mocked<PublicMethodsOf<SessionExpired>>;
}
