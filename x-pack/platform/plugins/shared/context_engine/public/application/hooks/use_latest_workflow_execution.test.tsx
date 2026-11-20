/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useLatestWorkflowExecution } from './use_latest_workflow_execution';

const mockGetWorkflowExecutions = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getWorkflowExecutions: mockGetWorkflowExecutions }),
}));

const RUNNING_REFETCH_MS = 3_000;
const IDLE_REFETCH_MS = 30_000;

const production = {
  executionTypes: [ExecutionType.PRODUCTION],
  sortField: 'createdAt',
  sortOrder: 'desc',
  size: 1,
  omitStepRuns: true,
};

interface FakeRun {
  id: string;
  status: ExecutionStatus;
  startedAt?: string;
  createdAt?: string;
}

interface FakeRuns {
  latest: FakeRun[];
  active: FakeRun[];
}

const withDefaults = (run: FakeRun): FakeRun => ({
  startedAt: '2024-01-01T00:00:00.000Z',
  ...run,
});

const serveRunsForWorkflow = (byWorkflow: Record<string, FakeRuns>) =>
  mockGetWorkflowExecutions.mockImplementation(async (workflowId, query) => {
    const runs = byWorkflow[workflowId] ?? { latest: [], active: [] };
    const source = query.statuses ? runs.active : runs.latest;
    return { results: source.map(withDefaults) };
  });

const serveRuns = (runs: FakeRuns) => serveRunsForWorkflow({ 'wf-1': runs });

const latestRunQueries = () =>
  mockGetWorkflowExecutions.mock.calls.filter(([, query]) => query.statuses === undefined).length;

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

const renderLatest = (
  workflowIds: readonly string[] = ['wf-1'],
  options?: {
    enabled?: boolean;
    awaitedExecutionIds?: readonly string[];
    onAwaitedObserved?: () => void;
  }
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: silentLogger,
  });
  return renderHook(() => useLatestWorkflowExecution(workflowIds, options), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

const { setImmediate: realSetImmediate } = jest.requireActual<typeof import('timers')>('timers');

const settle = () =>
  act(async () => {
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(0);
      await new Promise((resolve) => realSetImmediate(resolve));
    }
  });

const advance = async (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
  await settle();
};

describe('useLatestWorkflowExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the newest production run, without its steps', async () => {
    serveRuns({ latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }], active: [] });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.executions).toEqual(expect.anything()));
    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith('wf-1', production);
    expect(result.current).toEqual(
      expect.objectContaining({
        isRunning: false,
        executions: [
          {
            workflowId: 'wf-1',
            execution: expect.objectContaining({ id: 'run-1' }),
          },
        ],
      })
    );
  });

  it('looks up the active run separately, so a newer skipped run does not hide it', async () => {
    serveRuns({
      latest: [{ id: 'run-3', status: ExecutionStatus.SKIPPED }],
      active: [{ id: 'run-2', status: ExecutionStatus.RUNNING }],
    });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.isRunning).toBe(true));
    expect(result.current.activeExecutionId).toBe('run-2');
    expect(result.current.executions?.[0]?.execution).toEqual(
      expect.objectContaining({ id: 'run-3' })
    );
    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({ statuses: expect.arrayContaining([ExecutionStatus.RUNNING]) })
    );
    const [, activeQuery] = mockGetWorkflowExecutions.mock.calls[1];
    expect(activeQuery.statuses).not.toContain(ExecutionStatus.COMPLETED);
  });

  it('returns an empty executions list for a workflow that never ran', async () => {
    serveRuns({ latest: [], active: [] });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.executions).toEqual([]));
    expect(result.current.isRunning).toBe(false);
  });

  it('keeps a just-started run as running until the query observes it', async () => {
    serveRuns({ latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }], active: [] });

    const { result } = renderLatest(['wf-1'], { awaitedExecutionIds: ['run-2'] });

    await waitFor(() => expect(result.current.executions).toEqual(expect.anything()));
    expect(result.current.isRunning).toBe(true);
  });

  it('calls onAwaitedObserved once the awaited run id appears', async () => {
    const onAwaitedObserved = jest.fn();
    serveRuns({
      latest: [{ id: 'run-2', status: ExecutionStatus.COMPLETED }],
      active: [],
    });

    const { result } = renderLatest(['wf-1'], {
      awaitedExecutionIds: ['run-2'],
      onAwaitedObserved,
    });

    await waitFor(() => expect(onAwaitedObserved).toHaveBeenCalledTimes(1));
    expect(result.current.executions?.[0]?.execution).toEqual(
      expect.objectContaining({ id: 'run-2' })
    );
    expect(result.current.isRunning).toBe(false);
    expect(result.current.activeExecutionId).toBeUndefined();
  });

  it('does not call onAwaitedObserved while the awaited id has not been observed', async () => {
    const onAwaitedObserved = jest.fn();
    serveRuns({ latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }], active: [] });

    const { result } = renderLatest(['wf-1'], {
      awaitedExecutionIds: ['run-2'],
      onAwaitedObserved,
    });

    await waitFor(() => expect(result.current.executions).toEqual(expect.anything()));
    expect(onAwaitedObserved).not.toHaveBeenCalled();
    expect(result.current.isRunning).toBe(true);
  });

  it('reports a failed query instead of dropping the status', async () => {
    mockGetWorkflowExecutions.mockRejectedValue(new Error('search failed'));

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.executions).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
  });

  it('reads nothing while disabled', () => {
    const { result } = renderLatest(['wf-1'], { enabled: false });

    expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      executions: undefined,
      unavailableWorkflowIds: [],
      isRunning: false,
      activeExecutionId: undefined,
      isError: false,
      isLoading: false,
    });
  });

  describe('multiple workflow ids', () => {
    it('lists executions in workflowIds order', async () => {
      serveRunsForWorkflow({
        'wf-first': {
          latest: [
            {
              id: 'run-old',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          active: [],
        },
        'wf-second': {
          latest: [
            {
              id: 'run-new',
              status: ExecutionStatus.COMPLETED,
              startedAt: '2024-06-01T00:00:00.000Z',
            },
          ],
          active: [],
        },
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.executions).toHaveLength(2));
      expect(result.current.unavailableWorkflowIds).toEqual([]);
      expect(result.current.executions).toEqual([
        {
          workflowId: 'wf-first',
          execution: expect.objectContaining({ id: 'run-old' }),
        },
        {
          workflowId: 'wf-second',
          execution: expect.objectContaining({ id: 'run-new' }),
        },
      ]);
    });

    it('skips workflows with no run in executions but includes those that ran', async () => {
      serveRunsForWorkflow({
        'wf-first': { latest: [], active: [] },
        'wf-second': {
          latest: [{ id: 'run-2', status: ExecutionStatus.COMPLETED }],
          active: [],
        },
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.executions).toHaveLength(1));
      expect(result.current.executions?.[0]?.workflowId).toBe('wf-second');
    });

    it('isRunning when any workflow has an active execution', async () => {
      serveRunsForWorkflow({
        'wf-first': { latest: [], active: [] },
        'wf-second': {
          latest: [{ id: 'run-2', status: ExecutionStatus.RUNNING }],
          active: [{ id: 'run-2', status: ExecutionStatus.RUNNING }],
        },
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.isRunning).toBe(true));
      expect(result.current.activeExecutionId).toBe('run-2');
    });

    it('returns an empty list when none of the workflows ever ran', async () => {
      serveRunsForWorkflow({
        'wf-first': { latest: [], active: [] },
        'wf-second': { latest: [], active: [] },
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.executions).toEqual([]));
    });

    it('shows the second workflow when the first query failed', async () => {
      mockGetWorkflowExecutions.mockImplementation(async (workflowId, query) => {
        if (workflowId === 'wf-first') {
          throw new Error('lookup failed');
        }
        const runs =
          workflowId === 'wf-second'
            ? {
                latest: [{ id: 'run-2', status: ExecutionStatus.COMPLETED }],
                active: [],
              }
            : { latest: [], active: [] };
        return { results: query.statuses ? runs.active : runs.latest.map(withDefaults) };
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() =>
        expect(result.current.executions?.[0]?.execution).toEqual(
          expect.objectContaining({ id: 'run-2' })
        )
      );
      expect(result.current.isError).toBe(true);
      expect(result.current.unavailableWorkflowIds).toEqual(['wf-first']);
      expect(result.current.executions).toEqual([
        {
          workflowId: 'wf-second',
          execution: expect.objectContaining({ id: 'run-2' }),
        },
      ]);
    });

    it('leaves executions undefined when every query failed', async () => {
      mockGetWorkflowExecutions.mockRejectedValue(new Error('lookup failed'));

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.executions).toBeUndefined();
    });

    it('leaves executions undefined while any query is still pending', async () => {
      mockGetWorkflowExecutions.mockImplementation((workflowId, query) => {
        if (workflowId === 'wf-first') {
          return new Promise(() => {});
        }
        const runs = {
          latest: [{ id: 'run-2', status: ExecutionStatus.COMPLETED }],
          active: [],
        };
        return Promise.resolve({
          results: query.statuses ? runs.active : runs.latest.map(withDefaults),
        });
      });

      const { result } = renderLatest(['wf-first', 'wf-second']);

      await waitFor(() => expect(result.current.isLoading).toBe(true));
      expect(result.current.executions).toBeUndefined();
    });

    it('settles when awaited ids appear on different refetches after a newer run replaces an earlier one', async () => {
      jest.useFakeTimers();
      try {
        const onAwaitedObserved = jest.fn();
        const byWorkflow: Record<string, FakeRuns> = {
          'wf-first': {
            latest: [{ id: 'run-a', status: ExecutionStatus.COMPLETED }],
            active: [],
          },
          'wf-second': {
            latest: [{ id: 'run-placeholder', status: ExecutionStatus.SKIPPED }],
            active: [],
          },
        };
        serveRunsForWorkflow(byWorkflow);

        const { result } = renderLatest(['wf-first', 'wf-second'], {
          awaitedExecutionIds: ['run-a', 'run-b'],
          onAwaitedObserved,
        });

        await advance(0);
        expect(onAwaitedObserved).not.toHaveBeenCalled();
        expect(result.current.isRunning).toBe(true);

        byWorkflow['wf-first'].latest = [{ id: 'run-newer', status: ExecutionStatus.SKIPPED }];
        await advance(RUNNING_REFETCH_MS);
        expect(onAwaitedObserved).not.toHaveBeenCalled();
        expect(result.current.isRunning).toBe(true);

        byWorkflow['wf-second'].latest = [{ id: 'run-b', status: ExecutionStatus.COMPLETED }];
        await advance(RUNNING_REFETCH_MS);
        await waitFor(() => expect(onAwaitedObserved).toHaveBeenCalledTimes(1));
        expect(result.current.isRunning).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });

    it('calls onAwaitedObserved only after every awaited id is seen', async () => {
      const onAwaitedObserved = jest.fn();
      serveRunsForWorkflow({
        'wf-first': {
          latest: [{ id: 'run-a', status: ExecutionStatus.COMPLETED }],
          active: [],
        },
        'wf-second': {
          latest: [{ id: 'run-b', status: ExecutionStatus.COMPLETED }],
          active: [{ id: 'run-z', status: ExecutionStatus.RUNNING }],
        },
      });

      renderLatest(['wf-first', 'wf-second'], {
        awaitedExecutionIds: ['run-a', 'run-z'],
        onAwaitedObserved,
      });

      await waitFor(() => expect(onAwaitedObserved).toHaveBeenCalledTimes(1));
    });
  });

  it('keeps executions from cached data when a background refetch fails', async () => {
    jest.useFakeTimers();
    try {
      let failRefetch = false;
      mockGetWorkflowExecutions.mockImplementation(async (_workflowId, query) => {
        if (failRefetch) {
          throw new Error('refetch failed');
        }
        const runs = {
          latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }],
          active: [] as FakeRun[],
        };
        const source = query.statuses ? runs.active : runs.latest;
        return { results: source.map(withDefaults) };
      });

      const { result } = renderLatest();
      await advance(0);
      expect(result.current.executions?.[0]?.execution).toEqual(
        expect.objectContaining({ id: 'run-1' })
      );

      failRefetch = true;
      await advance(IDLE_REFETCH_MS);
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.executions).toEqual([
        {
          workflowId: 'wf-1',
          execution: expect.objectContaining({ id: 'run-1' }),
        },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('polls every 30 seconds while idle and every 3 seconds while a run is in progress', async () => {
      const runs: FakeRuns = {
        latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }],
        active: [],
      };
      serveRuns(runs);

      const { result } = renderLatest();
      await advance(0);
      expect(result.current.executions?.[0]?.execution).toEqual(
        expect.objectContaining({ id: 'run-1' })
      );
      expect(latestRunQueries()).toBe(1);

      runs.latest = [{ id: 'run-2', status: ExecutionStatus.RUNNING }];
      runs.active = [{ id: 'run-2', status: ExecutionStatus.RUNNING }];
      await advance(IDLE_REFETCH_MS - 1);
      expect(latestRunQueries()).toBe(1);
      await advance(1);
      expect(latestRunQueries()).toBe(2);
      expect(result.current.isRunning).toBe(true);

      await advance(RUNNING_REFETCH_MS - 1);
      expect(latestRunQueries()).toBe(2);
      await advance(1);
      expect(latestRunQueries()).toBe(3);

      runs.latest = [{ id: 'run-2', status: ExecutionStatus.COMPLETED }];
      runs.active = [];
      await advance(RUNNING_REFETCH_MS);
      expect(latestRunQueries()).toBe(4);
      expect(result.current.isRunning).toBe(false);
      await advance(IDLE_REFETCH_MS - 1);
      expect(latestRunQueries()).toBe(4);
      await advance(1);
      expect(latestRunQueries()).toBe(5);
    });
  });
});
