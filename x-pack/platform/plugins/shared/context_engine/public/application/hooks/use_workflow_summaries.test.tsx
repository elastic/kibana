/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowSummaries } from './use_workflow_summaries';

const mockMgetWorkflows = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ mgetWorkflows: mockMgetWorkflows }),
}));

const renderSummaries = (initialIds: string[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(({ ids }) => useWorkflowSummaries(ids), {
    initialProps: { ids: initialIds },
    wrapper,
  });
};

describe('useWorkflowSummaries', () => {
  beforeEach(() => {
    mockMgetWorkflows.mockResolvedValue([{ id: 'wf-1', name: 'My workflow', enabled: true }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch and is not loading when there are no ids', () => {
    const { result } = renderSummaries([]);

    expect(result.current.isLoading).toBe(false);
    expect(mockMgetWorkflows).not.toHaveBeenCalled();
  });

  it('resolves the summaries keyed by workflow id', async () => {
    const { result } = renderSummaries(['wf-1']);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockMgetWorkflows).toHaveBeenCalledWith({ ids: ['wf-1'] });
    expect(result.current.summaries.get('wf-1')).toEqual({
      id: 'wf-1',
      name: 'My workflow',
      enabled: true,
    });
  });

  it('deduplicates and sorts the ids so the same set is fetched once', async () => {
    const { result, rerender } = renderSummaries(['wf-2', 'wf-1', 'wf-1']);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ ids: ['wf-1', 'wf-2'] });

    expect(mockMgetWorkflows).toHaveBeenCalledTimes(1);
    expect(mockMgetWorkflows).toHaveBeenCalledWith({ ids: ['wf-1', 'wf-2'] });
  });

  it('keeps the resolved summaries while a changed set of ids is fetched', async () => {
    const { result, rerender } = renderSummaries(['wf-1']);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockMgetWorkflows.mockReturnValue(new Promise(() => {}));
    rerender({ ids: ['wf-1', 'wf-2'] });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.summaries.get('wf-1')?.name).toBe('My workflow');
  });
});
