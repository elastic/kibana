/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthServiceContract } from './auth_service';

/**
 * Returns a fully-stubbed {@link AuthServiceContract} whose `ensureAuthorized`
 * authorizes by default; tests override with `mockRejectedValue(...)` to
 * exercise the denied path.
 */
export function createAuthServiceMock(): jest.Mocked<AuthServiceContract> {
  return {
    ensureAuthorized: jest.fn().mockResolvedValue(undefined),
  };
}
