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

interface FakeRuns {
  latest: Array<{ id: string; status: ExecutionStatus }>;
  active: Array<{ id: string; status: ExecutionStatus }>;
}

/** Answers the newest-run query from `latest` and the active-run query from `active`. */
const serveRuns = (runs: FakeRuns) =>
  mockGetWorkflowExecutions.mockImplementation(async (_workflowId, query) => ({
    results: query.statuses ? runs.active : runs.latest,
  }));

const latestRunQueries = () =>
  mockGetWorkflowExecutions.mock.calls.filter(([, query]) => query.statuses === undefined).length;

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

const renderLatest = (options?: { enabled?: boolean; awaitedExecutionId?: string }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: silentLogger,
  });
  return renderHook(() => useLatestWorkflowExecution('wf-1', options), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

const { setImmediate: realSetImmediate } = jest.requireActual<typeof import('timers')>('timers');

/** react-query schedules its notifications with setTimeout(0), which fake timers hold back. */
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

    await waitFor(() => expect(result.current.execution).toEqual(expect.anything()));
    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith('wf-1', production);
    expect(result.current).toEqual(
      expect.objectContaining({
        isRunning: false,
        execution: expect.objectContaining({ id: 'run-1' }),
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
    expect(result.current.execution).toEqual(expect.objectContaining({ id: 'run-3' }));
    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith(
      'wf-1',
      expect.objectContaining({ statuses: expect.arrayContaining([ExecutionStatus.RUNNING]) })
    );
    const [, activeQuery] = mockGetWorkflowExecutions.mock.calls[1];
    expect(activeQuery.statuses).not.toContain(ExecutionStatus.COMPLETED);
  });

  it('returns null for a workflow that never ran', async () => {
    serveRuns({ latest: [], active: [] });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.execution).toBeNull());
    expect(result.current.isRunning).toBe(false);
  });

  it('keeps a just-started run as running until the query observes it', async () => {
    serveRuns({ latest: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }], active: [] });

    const { result } = renderLatest({ awaitedExecutionId: 'run-2' });

    await waitFor(() => expect(result.current.execution).toEqual(expect.anything()));
    expect(result.current.isRunning).toBe(true);
  });

  it('reports a failed query instead of dropping the status', async () => {
    mockGetWorkflowExecutions.mockRejectedValue(new Error('search failed'));

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.execution).toBeUndefined();
    expect(result.current.isRunning).toBe(false);
  });

  it('reads nothing while disabled', () => {
    const { result } = renderLatest({ enabled: false });

    expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      execution: undefined,
      isRunning: false,
      activeExecutionId: undefined,
      isError: false,
      isLoading: false,
    });
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
      expect(result.current.execution).toEqual(expect.objectContaining({ id: 'run-1' }));
      expect(latestRunQueries()).toBe(1);

      // A scheduled run starts and is only discovered by the idle poll.
      runs.latest = [{ id: 'run-2', status: ExecutionStatus.RUNNING }];
      runs.active = [{ id: 'run-2', status: ExecutionStatus.RUNNING }];
      await advance(IDLE_REFETCH_MS - 1);
      expect(latestRunQueries()).toBe(1);
      await advance(1);
      expect(latestRunQueries()).toBe(2);
      expect(result.current.isRunning).toBe(true);

      // While it runs, the row polls at the running interval.
      await advance(RUNNING_REFETCH_MS - 1);
      expect(latestRunQueries()).toBe(2);
      await advance(1);
      expect(latestRunQueries()).toBe(3);

      // Once it completes, polling falls back to the idle interval.
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
