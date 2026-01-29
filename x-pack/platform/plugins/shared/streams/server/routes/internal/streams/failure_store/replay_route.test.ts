/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReplayStatusResponse } from './replay_route';

describe('Replay Route Types', () => {
  describe('ReplayStatusResponse', () => {
    it('should allow not_started status', () => {
      const response: ReplayStatusResponse = {
        status: 'not_started',
      };
      expect(response.status).toBe('not_started');
    });

    it('should allow in_progress status with progress data', () => {
      const response: ReplayStatusResponse = {
        status: 'in_progress',
        taskId: 'node:123',
        total: 100,
        created: 50,
        updated: 0,
        deleted: 0,
        batches: 5,
        versionConflicts: 2,
        noops: 3,
      };
      expect(response.status).toBe('in_progress');
      expect(response.taskId).toBe('node:123');
      expect(response.total).toBe(100);
      expect(response.created).toBe(50);
    });

    it('should allow completed status with final stats', () => {
      const response: ReplayStatusResponse = {
        status: 'completed',
        taskId: 'node:123',
        total: 100,
        created: 98,
        updated: 0,
        deleted: 0,
        batches: 10,
        versionConflicts: 2,
        noops: 0,
        retries: { bulk: 0, search: 0 },
        took: 5000,
        failures: [],
      };
      expect(response.status).toBe('completed');
      expect(response.total).toBe(100);
      expect(response.created).toBe(98);
      expect(response.took).toBe(5000);
    });

    it('should allow failed status with error message', () => {
      const response: ReplayStatusResponse = {
        status: 'failed',
        taskId: 'node:123',
        error: 'Something went wrong',
        failures: [{ cause: { type: 'mapper_exception', reason: 'field mapping error' } }],
      };
      expect(response.status).toBe('failed');
      expect(response.error).toBe('Something went wrong');
      expect(response.failures).toHaveLength(1);
    });

    it('should allow canceled status', () => {
      const response: ReplayStatusResponse = {
        status: 'canceled',
        taskId: 'node:123',
      };
      expect(response.status).toBe('canceled');
      expect(response.taskId).toBe('node:123');
    });
  });
});
