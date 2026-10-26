/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

export interface RecoveryResult {
  keys: Array<{ id: string; backend: 'es' | 'uiam' }>;
  usernames: string[];
  headersUnchanged: boolean;
  snapshotExpired: boolean;
  cleanupComplete: boolean;
}

export const singleExpiryTimeout = 90_000;
export const repeatedExpiryTimeout = 150_000;

export const recoveryScenarios = [
  { scenario: 'grants', keys: 2, identities: 2 },
  { scenario: 'concurrent_grants', keys: 3, identities: 3 },
  { scenario: 'scoped', keys: 0, identities: 3 },
  { scenario: 'mixed', keys: 2, identities: 4 },
  { scenario: 'late', keys: 1, identities: 3 },
] as const;

export const expectRecovery = (
  response: ApiClientResponse<RecoveryResult>,
  expected: { keys: number; identities: number; username: string; snapshotExpired?: boolean }
) => {
  expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
  expect(response.body.headersUnchanged).toBe(true);
  expect(response.body.snapshotExpired).toBe(expected.snapshotExpired ?? true);
  expect(response.body.cleanupComplete).toBe(true);
  expect(response.body.keys).toHaveLength(expected.keys);
  expect(new Set(response.body.keys.map((key) => key.id)).size).toBe(expected.keys);
  expect(response.body.usernames).toStrictEqual(Array(expected.identities).fill(expected.username));
};
