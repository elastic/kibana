/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { TaskClient } from './task_client';

describe('TaskClient', () => {
  describe('getLastActivity', () => {
    it('returns created_at when no other timestamps exist', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-15T10:00:00.000Z'));
    });

    it('returns the most recent timestamp when multiple exist', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
        last_completed_at: '2024-01-16T10:00:00.000Z',
        last_acknowledged_at: '2024-01-17T10:00:00.000Z', // Most recent
        last_canceled_at: '2024-01-14T10:00:00.000Z',
        last_failed_at: '2024-01-13T10:00:00.000Z',
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-17T10:00:00.000Z'));
    });

    it('returns last_completed_at when it is the most recent', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
        last_completed_at: '2024-01-20T10:00:00.000Z', // Most recent
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-20T10:00:00.000Z'));
    });

    it('returns last_canceled_at when it is the most recent', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
        last_completed_at: '2024-01-16T10:00:00.000Z',
        last_canceled_at: '2024-01-20T10:00:00.000Z', // Most recent
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-20T10:00:00.000Z'));
    });

    it('returns last_failed_at when it is the most recent', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
        last_failed_at: '2024-01-20T10:00:00.000Z', // Most recent
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-20T10:00:00.000Z'));
    });

    it('ignores undefined timestamps', () => {
      const task = {
        created_at: '2024-01-15T10:00:00.000Z',
        last_completed_at: undefined,
        last_acknowledged_at: '2024-01-17T10:00:00.000Z',
        last_canceled_at: undefined,
        last_failed_at: undefined,
      };

      const result = TaskClient.getLastActivity(task);

      expect(result).toEqual(new Date('2024-01-17T10:00:00.000Z'));
    });
  });
});
