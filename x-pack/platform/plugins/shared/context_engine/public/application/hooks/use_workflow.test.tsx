/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflow } from './use_workflow';

const mockGetWorkflow = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({ getWorkflow: mockGetWorkflow }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

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
});
