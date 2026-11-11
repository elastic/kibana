/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchWorkflowsByIds } from './use_fetch_workflows_by_ids';

const mockGetWorkflow = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({ getWorkflow: mockGetWorkflow }),
  CoreStart: (key: string) => key,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retryDelay: 0 },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

describe('useFetchWorkflowsByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the loaded workflows for the given ids', async () => {
    mockGetWorkflow.mockImplementation(async (id: string) => ({ id, name: `Workflow ${id}` }));

    const { result } = renderHook(() => useFetchWorkflowsByIds(['wf-1', 'wf-2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map(({ id }) => id)).toEqual(['wf-1', 'wf-2']);
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1');
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-2');
  });

  it('skips workflows that failed to load', async () => {
    mockGetWorkflow.mockImplementation(async (id: string) => {
      if (id === 'wf-2') {
        throw httpError(404);
      }
      return { id, name: `Workflow ${id}` };
    });

    const { result } = renderHook(() => useFetchWorkflowsByIds(['wf-1', 'wf-2']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    await waitFor(() => expect(mockGetWorkflow).toHaveBeenCalledTimes(2));
    expect(result.current.map(({ id }) => id)).toEqual(['wf-1']);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useFetchWorkflowsByIds(['wf-1'], false), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual([]);
    expect(mockGetWorkflow).not.toHaveBeenCalled();
  });

  it('does not fetch without ids', () => {
    const { result } = renderHook(() => useFetchWorkflowsByIds([]), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual([]);
    expect(mockGetWorkflow).not.toHaveBeenCalled();
  });
});
