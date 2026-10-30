/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useLatestWorkflowExecution } from './use_latest_workflow_execution';

const mockGetWorkflowExecutions = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getWorkflowExecutions: mockGetWorkflowExecutions }),
}));

const renderLatest = (options?: { enabled?: boolean }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useLatestWorkflowExecution('wf-1', options), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
};

describe('useLatestWorkflowExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the newest production run, without its steps', async () => {
    mockGetWorkflowExecutions.mockResolvedValue({
      results: [{ id: 'run-1', status: ExecutionStatus.COMPLETED }],
    });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.execution).toEqual(expect.anything()));
    expect(mockGetWorkflowExecutions).toHaveBeenCalledWith('wf-1', {
      executionTypes: [ExecutionType.PRODUCTION],
      sortField: 'createdAt',
      sortOrder: 'desc',
      size: 1,
      omitStepRuns: true,
    });
    expect(result.current).toEqual(
      expect.objectContaining({
        isRunning: false,
        execution: expect.objectContaining({ id: 'run-1' }),
      })
    );
  });

  it('reports a run that has not finished as running', async () => {
    mockGetWorkflowExecutions.mockResolvedValue({
      results: [{ id: 'run-2', status: ExecutionStatus.RUNNING }],
    });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.isRunning).toBe(true));
  });

  it('returns null for a workflow that never ran', async () => {
    mockGetWorkflowExecutions.mockResolvedValue({ results: [] });

    const { result } = renderLatest();

    await waitFor(() => expect(result.current.execution).toBeNull());
    expect(result.current.isRunning).toBe(false);
  });

  it('reads nothing while disabled', () => {
    const { result } = renderLatest({ enabled: false });

    expect(mockGetWorkflowExecutions).not.toHaveBeenCalled();
    expect(result.current).toEqual({ execution: undefined, isRunning: false, isLoading: false });
  });
});
