/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallFailedAttempt } from '../../../types';

import {
  clearLatestFailedAttempts,
  addErrorToLatestFailedAttempts,
} from './install_errors_helpers';

const generateFailedAttempt = (version: string) => ({
  target_version: version,
  created_at: new Date().toISOString(),
  error: {
    name: 'test',
    message: 'test',
  },
});

const mapFailledAttempsToTargetVersion = (attemps: InstallFailedAttempt[]) =>
  attemps.map((attempt) => attempt.target_version);

describe('Install error helpers', () => {
  describe('clearLatestFailedAttempts', () => {
    const previousFailedAttemps: InstallFailedAttempt[] = [
      generateFailedAttempt('0.1.0'),
      generateFailedAttempt('0.2.0'),
    ];
    it('should clear previous error on succesfull upgrade', () => {
      const currentFailledAttemps = clearLatestFailedAttempts('0.2.0', previousFailedAttemps);

      expect(mapFailledAttempsToTargetVersion(currentFailledAttemps)).toEqual([]);
    });

    it('should not clear previous upgrade error on succesfull rollback', () => {
      const currentFailledAttemps = clearLatestFailedAttempts('0.1.0', previousFailedAttemps);

      expect(mapFailledAttempsToTargetVersion(currentFailledAttemps)).toEqual(['0.2.0']);
    });
  });

  describe('addErrorToLatestFailedAttempts', () => {
    it('should only keep 5 errors', () => {
      const previousFailedAttemps: InstallFailedAttempt[] = [
        generateFailedAttempt('0.2.5'),
        generateFailedAttempt('0.2.4'),
        generateFailedAttempt('0.2.3'),
        generateFailedAttempt('0.2.2'),
        generateFailedAttempt('0.2.1'),
      ];
      const currentFailledAttemps = addErrorToLatestFailedAttempts({
        targetVersion: '0.2.6',
        createdAt: new Date().toISOString(),
        error: new Error('new test'),
        latestAttempts: previousFailedAttemps,
      });

      expect(mapFailledAttempsToTargetVersion(currentFailledAttemps)).toEqual([
        '0.2.6',
        '0.2.5',
        '0.2.4',
        '0.2.3',
        '0.2.2',
      ]);
    });
  });
});
