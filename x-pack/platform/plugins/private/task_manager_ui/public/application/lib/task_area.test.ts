/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTaskTypeSummary } from '../test_utils';
import { getTaskTypeArea, summarizeAreas } from './task_area';

describe('getTaskTypeArea', () => {
  it.each([
    ['fleet:setup', 'fleet'],
    ['Fleet-Usage-Logger', 'fleet'],
    ['SLO:ORPHAN_SUMMARIES-CLEANUP-TASK', 'slo'],
    ['alerting_v2:dispatcher', 'alerting_v2'],
    ['task_manager:invalidate_api_keys', 'task_manager'],
    ['cases.analyticsV2.reconciliation', 'cases'],
    ['security-solution-ea-backfill-alert-entity-id', 'security'],
    ['dashboard_telemetry', 'dashboard'],
  ])('derives the area of %s from its name', (taskType, area) => {
    expect(getTaskTypeArea(taskType)).toBe(area);
  });

  it('prefers the task type group set by the alerting and actions frameworks', () => {
    expect(getTaskTypeArea('ad_hoc_run-backfill', 'alerting')).toBe('alerting');
  });
});

describe('summarizeAreas', () => {
  it('rolls task types up by area', () => {
    const areas = summarizeAreas([
      createTaskTypeSummary({
        task_type: 'fleet:setup',
        tasks: 1,
        overdue: 0,
        runs: {
          success: 3,
          failure: 1,
          failed_tasks: 1,
          last_failure: { at: '2026-11-02T10:00:00.000Z', task_id: 'a', message: 'Old' },
        },
      }),
      createTaskTypeSummary({
        task_type: 'Fleet-Usage-Logger',
        tasks: 2,
        overdue: 1,
        runs: {
          success: 0,
          failure: 4,
          failed_tasks: 1,
          last_failure: { at: '2026-11-02T11:00:00.000Z', task_id: 'b', message: 'New' },
        },
      }),
      createTaskTypeSummary({ task_type: 'fleet:bump_agent_policies', tasks: 1, runs: undefined }),
      createTaskTypeSummary({
        task_type: 'session_cleanup',
        tasks: 1,
        overdue: 0,
        runs: undefined,
      }),
    ]);

    expect(areas).toEqual([
      {
        area: 'fleet',
        taskTypes: 3,
        failingTaskTypes: 2,
        tasks: 4,
        overdue: 2,
        tasksWithFailures: 2,
        runs: 8,
        failedRuns: 5,
        failureRate: 5 / 8,
        lastFailureAt: '2026-11-02T11:00:00.000Z',
        lastFailureTaskType: 'Fleet-Usage-Logger',
        lastFailureMessage: 'New',
      },
      {
        area: 'session',
        taskTypes: 1,
        failingTaskTypes: 0,
        tasks: 1,
        overdue: 0,
        tasksWithFailures: 0,
        runs: 0,
        failedRuns: 0,
        failureRate: undefined,
      },
    ]);
  });
});
