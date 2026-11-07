/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskExplanationReason } from '@kbn/task-manager-plugin/common';
import { getReasonMessage, getVerdictTitle } from './explanation';

describe('explanation', () => {
  describe('getVerdictTitle', () => {
    it.each([
      ['blocked', "This task won't run"],
      ['attention', 'This task needs attention'],
      ['ok', 'This task is on track'],
    ] as const)('returns the title for %p', (verdict, expected) => {
      expect(getVerdictTitle(verdict)).toBe(expected);
    });
  });

  describe('getReasonMessage', () => {
    const reasons: TaskExplanationReason[] = [
      { code: 'type_not_registered' },
      { code: 'unrecognized' },
      { code: 'type_excluded' },
      { code: 'execution_paused' },
      { code: 'task_type_paused' },
      { code: 'disabled' },
      { code: 'failed', attempts: 3, max_attempts: 3 },
      { code: 'dead_letter' },
      { code: 'should_delete' },
      { code: 'running', owner_id: 'node-1', retry_at: '2026-11-02T12:05:00.000Z' },
      { code: 'stuck', owner_id: 'node-1', retry_at: '2026-11-02T11:55:00.000Z' },
      { code: 'scheduled', run_at: '2026-11-02T13:00:00.000Z' },
      { code: 'due', run_at: '2026-11-02T12:00:00.000Z' },
      { code: 'overdue', run_at: '2026-11-02T11:00:00.000Z', overdue_ms: 3_600_000 },
      { code: 'removed' },
      {
        code: 'last_run_failed',
        consecutive_failures: 1,
        runs_checked: 5,
        failed_at: '2026-11-02T11:59:00.000Z',
      },
    ];

    it.each(reasons.map((reason) => [reason.code, reason] as const))(
      'returns a message for %p',
      (_code, reason) => {
        expect(getReasonMessage(reason)).not.toHaveLength(0);
      }
    );

    it('includes the attempt counts for failed tasks', () => {
      expect(getReasonMessage({ code: 'failed', attempts: 2, max_attempts: 5 })).toBe(
        'The task failed after 2 of 5 attempts and will not be retried.'
      );
    });

    it('includes how long the task is overdue', () => {
      expect(
        getReasonMessage({
          code: 'overdue',
          run_at: '2026-11-02T11:00:00.000Z',
          overdue_ms: 90_000,
        })
      ).toContain('The task is 1.5 min overdue.');
    });

    it('falls back to the empty value when the owner is unknown', () => {
      expect(
        getReasonMessage({ code: 'stuck', owner_id: null, retry_at: '2026-11-02T11:55:00.000Z' })
      ).toContain('claimed by Kibana node - but');
    });

    describe('last_run_failed', () => {
      const failedAt = '2026-11-02T11:55:00.000Z';

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-11-02T12:00:00.000Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('describes a single failed run', () => {
        expect(
          getReasonMessage({
            code: 'last_run_failed',
            consecutive_failures: 1,
            runs_checked: 20,
            failed_at: failedAt,
          })
        ).toBe('The last run failed 5 minutes ago.');
      });

      it('counts consecutive failed runs', () => {
        expect(
          getReasonMessage({
            code: 'last_run_failed',
            consecutive_failures: 4,
            runs_checked: 20,
            failed_at: failedAt,
          })
        ).toBe('The last 4 runs failed, most recently 5 minutes ago.');
      });

      it('says when every recorded run failed', () => {
        expect(
          getReasonMessage({
            code: 'last_run_failed',
            consecutive_failures: 6,
            runs_checked: 6,
            failed_at: failedAt,
          })
        ).toBe('All of the last 6 recorded runs failed, most recently 5 minutes ago.');
      });
    });
  });
});
