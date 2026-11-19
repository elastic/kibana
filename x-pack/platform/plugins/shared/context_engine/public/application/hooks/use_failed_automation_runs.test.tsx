/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useFailedAutomationRuns } from './use_failed_automation_runs';
import { useLatestWorkflowExecution } from './use_latest_workflow_execution';

const mockGetWorkflowExecutions = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getWorkflowExecutions: mockGetWorkflowExecutions }),
}));

const latestStatusByWorkflow: Record<string, ExecutionStatus | undefined> = {
  'wf-failed': ExecutionStatus.FAILED,
  'wf-ok': ExecutionStatus.COMPLETED,
  'wf-timed-out': ExecutionStatus.TIMED_OUT,
  'wf-never-ran': undefined,
};

const silentLogger = { log: () => {}, warn: () => {}, error: () => {} };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: silentLogger,
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const latestRunCalls = (workflowId: string) =>
  mockGetWorkflowExecutions.mock.calls.filter(
    ([id, query]) => id === workflowId && query.statuses === undefined
  ).length;

describe('useFailedAutomationRuns', () => {
  beforeEach(() => {
    mockGetWorkflowExecutions.mockImplementation(async (workflowId: string, query) => {
      const status = latestStatusByWorkflow[workflowId];
      return {
        results:
          query.statuses || status === undefined
            ? []
            : [{ id: `${workflowId}-run`, status, error: null }],
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the automations whose latest run failed or timed out, in order', async () => {
    const { result } = renderHook(
      () => useFailedAutomationRuns(['wf-ok', 'wf-timed-out', 'wf-never-ran', 'wf-failed']),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.map(({ workflowId }) => workflowId)).toEqual([
        'wf-timed-out',
        'wf-failed',
      ]);
    });
    expect(result.current[1].execution).toEqual(
      expect.objectContaining({ id: 'wf-failed-run', status: ExecutionStatus.FAILED })
    );
  });

  it('does not fetch while disabled', () => {
    const { result } = renderHook(
      () => useFailedAutomationRuns(['wf-failed'], { enabled: false }),
      {
        wrapper: createWrapper(),
      }
    );

    expect(result.current).toEqual([]);
    expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('shares the latest run cache with the automation rows', async () => {
    const { result } = renderHook(
      () => ({
        failedRuns: useFailedAutomationRuns(['wf-failed']),
        latest: useLatestWorkflowExecution('wf-failed'),
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.failedRuns).toHaveLength(1);
    });
    expect(result.current.latest.execution?.id).toBe('wf-failed-run');
    expect(latestRunCalls('wf-failed')).toBe(1);
  });
});
