/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailedAttempt } from '../types';

import { updateUninstallFailedAttempts } from './epm/packages/uninstall_errors_helpers';

const generateFailedAttempt = () => ({
  created_at: new Date().toISOString(),
  error: {
    name: 'test',
    message: 'test',
  },
});

describe('Uninstall error helpers', () => {
  describe('updateUninstallFailedAttempts', () => {
    it('should only keep 5 errors', () => {
      const previousFailedAttempts: FailedAttempt[] = Array(5)
        .fill(null)
        .map((_) => generateFailedAttempt());
      const updatedLatestUninstallFailedAttempts = updateUninstallFailedAttempts({
        error: new Error('new test'),
        createdAt: new Date().toISOString(),
        latestAttempts: previousFailedAttempts,
      });

      expect(updatedLatestUninstallFailedAttempts.length).toEqual(5);
      expect(updatedLatestUninstallFailedAttempts[0].error.message).toEqual('new test');
    });
  });
});
