/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useFetchWorkflow } from './use_fetch_workflow';

const mockGetWorkflow = jest.fn();
const mockAddError = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: string) =>
    token === 'notifications'
      ? { toasts: { addError: mockAddError } }
      : { getWorkflow: mockGetWorkflow },
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

describe('useFetchWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the workflow by id', async () => {
    const workflow = { id: 'wf-1', name: 'Workflow 1' };
    mockGetWorkflow.mockResolvedValue(workflow);

    const { result } = renderHook(() => useFetchWorkflow('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetWorkflow).toHaveBeenCalledWith('wf-1');
    expect(result.current.data).toEqual(workflow);
  });

  it('does not retry when the workflow is not found', async () => {
    mockGetWorkflow.mockRejectedValue(httpError(404));

    const { result } = renderHook(() => useFetchWorkflow('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetWorkflow).toHaveBeenCalledTimes(1);
  });

  it('retries other errors up to 3 times', async () => {
    mockGetWorkflow.mockRejectedValue(httpError(500));

    const { result } = renderHook(() => useFetchWorkflow('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockGetWorkflow).toHaveBeenCalledTimes(4);
  });

  it('shows an error toast by default', async () => {
    mockGetWorkflow.mockRejectedValue(httpError(404));

    const { result } = renderHook(() => useFetchWorkflow('wf-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddError).toHaveBeenCalledTimes(1);
  });

  it('does not show an error toast when notifyOnError is false', async () => {
    mockGetWorkflow.mockRejectedValue(httpError(404));

    const { result } = renderHook(() => useFetchWorkflow('wf-1', true, { notifyOnError: false }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('does not fetch without an id', () => {
    renderHook(() => useFetchWorkflow(undefined), { wrapper: createWrapper() });

    expect(mockGetWorkflow).not.toHaveBeenCalled();
  });
});
