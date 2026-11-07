/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskRun, TaskSummary } from '../../../common';
import type { ExplainTaskContext } from './explain_task';
import { explainRemovedTask, explainTask } from './explain_task';

const NOW = new Date('2026-11-02T12:00:00.000Z');

const createTask = (overrides: Partial<TaskSummary> = {}): TaskSummary => ({
  id: 'task-1',
  task_type: 'alerting:.index-threshold',
  status: 'idle',
  enabled: true,
  run_at: '2026-11-02T12:05:00.000Z',
  attempts: 0,
  ...overrides,
});

const createContext = (overrides: Partial<ExplainTaskContext> = {}): ExplainTaskContext => ({
  now: NOW,
  isRegistered: true,
  maxAttempts: 3,
  excludedTaskTypes: [],
  executionPaused: false,
  pausedTaskTypes: [],
  dueGracePeriodMs: 3000,
  recentRuns: [],
  ...overrides,
});

const createRun = (
  outcome: 'success' | 'failure',
  timestamp: string,
  errorMessage?: string
): TaskRun => ({
  timestamp,
  outcome,
  ...(errorMessage ? { error_message: errorMessage } : {}),
});

describe('explainTask', () => {
  it('reports a scheduled task that is not due yet', () => {
    expect(explainTask(createTask(), createContext())).toEqual({
      verdict: 'ok',
      reasons: [{ code: 'scheduled', run_at: '2026-11-02T12:05:00.000Z' }],
    });
  });

  it('reports a task within the grace period as due', () => {
    const task = createTask({ run_at: '2026-11-02T11:59:59.000Z' });
    expect(explainTask(task, createContext())).toEqual({
      verdict: 'ok',
      reasons: [{ code: 'due', run_at: '2026-11-02T11:59:59.000Z' }],
    });
  });

  it('reports an idle task past its runAt and the grace period as overdue', () => {
    const task = createTask({ run_at: '2026-11-02T11:50:00.000Z' });
    expect(explainTask(task, createContext())).toEqual({
      verdict: 'attention',
      reasons: [{ code: 'overdue', run_at: '2026-11-02T11:50:00.000Z', overdue_ms: 600000 }],
    });
  });

  it('reports a running task whose retryAt is in the future as running', () => {
    const task = createTask({
      status: 'running',
      owner_id: 'kibana:node-1',
      retry_at: '2026-11-02T12:04:00.000Z',
    });
    expect(explainTask(task, createContext())).toEqual({
      verdict: 'ok',
      reasons: [
        { code: 'running', owner_id: 'kibana:node-1', retry_at: '2026-11-02T12:04:00.000Z' },
      ],
    });
  });

  it('reports a running task whose retryAt has passed as stuck', () => {
    const task = createTask({
      status: 'claiming',
      owner_id: 'kibana:node-1',
      retry_at: '2026-11-02T11:00:00.000Z',
    });
    expect(explainTask(task, createContext())).toEqual({
      verdict: 'attention',
      reasons: [{ code: 'stuck', owner_id: 'kibana:node-1', retry_at: '2026-11-02T11:00:00.000Z' }],
    });
  });

  it('reports a task type that is not registered on this node', () => {
    expect(explainTask(createTask(), createContext({ isRegistered: false }))).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'type_not_registered' }],
    });
  });

  it('reports an unrecognized task without also reporting it as unregistered', () => {
    const task = createTask({ status: 'unrecognized' });
    expect(explainTask(task, createContext({ isRegistered: false }))).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'unrecognized' }],
    });
  });

  it('matches excluded and paused task types as patterns', () => {
    const context = createContext({
      excludedTaskTypes: ['alerting:*'],
      pausedTaskTypes: ['alerting:.index-*'],
    });
    expect(explainTask(createTask(), context)).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'type_excluded' }, { code: 'task_type_paused' }],
    });
  });

  it('reports a global pause', () => {
    expect(explainTask(createTask(), createContext({ executionPaused: true }))).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'execution_paused' }],
    });
  });

  it('reports a disabled task', () => {
    expect(explainTask(createTask({ enabled: false }), createContext())).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'disabled' }],
    });
  });

  it('reports a failed task with its attempts', () => {
    const task = createTask({ status: 'failed', attempts: 3 });
    expect(explainTask(task, createContext())).toEqual({
      verdict: 'blocked',
      reasons: [{ code: 'failed', attempts: 3, max_attempts: 3 }],
    });
  });

  it.each([
    ['dead_letter', 'dead_letter'],
    ['should_delete', 'should_delete'],
  ])('reports a task with status %s', (status, code) => {
    expect(explainTask(createTask({ status }), createContext())).toEqual({
      verdict: 'blocked',
      reasons: [{ code }],
    });
  });

  it('returns every blocker that applies', () => {
    const task = createTask({ enabled: false, status: 'failed', attempts: 5 });
    const context = createContext({ executionPaused: true, maxAttempts: 5 });
    expect(explainTask(task, context).reasons.map(({ code }) => code)).toEqual([
      'execution_paused',
      'disabled',
      'failed',
    ]);
  });

  describe('recent runs', () => {
    it('flags a scheduled task whose most recent runs failed', () => {
      const recentRuns = [
        createRun('failure', '2026-11-02T11:59:00.000Z', 'unknown query [bogus]'),
        createRun('failure', '2026-11-02T11:58:00.000Z', 'unknown query [bogus]'),
        createRun('success', '2026-11-02T11:57:00.000Z'),
      ];
      expect(explainTask(createTask(), createContext({ recentRuns }))).toEqual({
        verdict: 'attention',
        reasons: [
          {
            code: 'last_run_failed',
            consecutive_failures: 2,
            runs_checked: 3,
            failed_at: '2026-11-02T11:59:00.000Z',
            error_message: 'unknown query [bogus]',
          },
          { code: 'scheduled', run_at: '2026-11-02T12:05:00.000Z' },
        ],
      });
    });

    it('counts every checked run when none of them succeeded', () => {
      const recentRuns = [
        createRun('failure', '2026-11-02T11:59:00.000Z'),
        createRun('failure', '2026-11-02T11:58:00.000Z'),
      ];
      expect(explainTask(createTask(), createContext({ recentRuns })).reasons[0]).toEqual({
        code: 'last_run_failed',
        consecutive_failures: 2,
        runs_checked: 2,
        failed_at: '2026-11-02T11:59:00.000Z',
      });
    });

    it('does not flag earlier failures once the most recent run succeeded', () => {
      const recentRuns = [
        createRun('success', '2026-11-02T11:59:00.000Z'),
        createRun('failure', '2026-11-02T11:58:00.000Z', 'Boom'),
      ];
      expect(explainTask(createTask(), createContext({ recentRuns }))).toEqual({
        verdict: 'ok',
        reasons: [{ code: 'scheduled', run_at: '2026-11-02T12:05:00.000Z' }],
      });
    });

    it('keeps a blocked verdict and lists the failure after the blockers', () => {
      const recentRuns = [createRun('failure', '2026-11-02T11:59:00.000Z', 'Boom')];
      expect(explainTask(createTask({ enabled: false }), createContext({ recentRuns }))).toEqual({
        verdict: 'blocked',
        reasons: [
          { code: 'disabled' },
          {
            code: 'last_run_failed',
            consecutive_failures: 1,
            runs_checked: 1,
            failed_at: '2026-11-02T11:59:00.000Z',
            error_message: 'Boom',
          },
        ],
      });
    });
  });
});

describe('explainRemovedTask', () => {
  it('flags a removed task whose last attempts failed', () => {
    const recentRuns = [
      createRun('failure', '2026-11-02T11:59:00.000Z', 'error indexing documents'),
      createRun('failure', '2026-11-02T11:58:00.000Z', 'error indexing documents'),
    ];
    expect(explainRemovedTask(recentRuns)).toEqual({
      verdict: 'attention',
      reasons: [
        { code: 'removed' },
        {
          code: 'last_run_failed',
          consecutive_failures: 2,
          runs_checked: 2,
          failed_at: '2026-11-02T11:59:00.000Z',
          error_message: 'error indexing documents',
        },
      ],
    });
  });

  it('reports a removed task whose last run succeeded as ok', () => {
    const recentRuns = [
      createRun('success', '2026-11-02T11:59:00.000Z'),
      createRun('failure', '2026-11-02T11:58:00.000Z', 'Boom'),
    ];
    expect(explainRemovedTask(recentRuns)).toEqual({
      verdict: 'ok',
      reasons: [{ code: 'removed' }],
    });
  });
});
