/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { isWorkflowNotFoundError, useWorkflow } from './use_workflow';

const mockGetWorkflow = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getWorkflow: mockGetWorkflow }),
}));

const createNotFoundError = () =>
  Object.assign(new Error('Not Found'), {
    name: 'HttpFetchError',
    request: { url: '/api/workflows/workflow/wf-1' },
    response: { status: 404 },
  });

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe('isWorkflowNotFoundError', () => {
  it('returns true for a 404 http error', () => {
    expect(isWorkflowNotFoundError(createNotFoundError())).toBe(true);
  });

  it('returns false for non-404 errors', () => {
    expect(isWorkflowNotFoundError(new Error('Forbidden'))).toBe(false);
  });
});

describe('useWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkflow.mockResolvedValue({
      id: 'wf-1',
      name: 'My workflow',
      yaml: 'name: test\nsteps: []',
    });
  });

  it('fetches the workflow', async () => {
    const { result } = renderHook(() => useWorkflow('wf-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.current.data).toEqual({
      id: 'wf-1',
      name: 'My workflow',
      yaml: 'name: test\nsteps: []',
    });
  });

  it('does not retry when the workflow is not found', async () => {
    mockGetWorkflow.mockRejectedValue(createNotFoundError());

    const queryClient = new QueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useWorkflow('wf-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockGetWorkflow).toHaveBeenCalledTimes(1);
  });
});
