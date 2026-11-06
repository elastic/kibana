/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useApplyDataStreamEdits } from './use_apply_data_stream_edits';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockApplyDataStreamEdits = api.applyDataStreamEdits as jest.Mock;

const mockToastsAddSuccess = jest.fn();
const mockToastsAddDanger = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: {},
      notifications: {
        toasts: {
          addSuccess: mockToastsAddSuccess,
          addDanger: mockToastsAddDanger,
        },
      },
    },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
  });
  queryClient.invalidateQueries = mockInvalidateQueries;

  function QueryClientTestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return QueryClientTestWrapper;
};

const REQUEST = {
  integrationId: 'int-1',
  dataStreamId: 'ds-1',
  ingestPipeline: '{"processors":[]}',
  version: 'WzEsMV0=',
  changes: [{ name: 'port', type: 'long' }],
};

describe('useApplyDataStreamEdits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates data stream and integration queries after a successful save', async () => {
    mockApplyDataStreamEdits.mockResolvedValue({ status: 'saved', ingest_pipeline: {} });

    const { result } = renderHook(() => useApplyDataStreamEdits(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.applyDataStreamEditsMutation.mutateAsync({
        ...REQUEST,
        dryRun: false,
      });
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['dataStreamResults', 'int-1', 'ds-1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['integration', 'int-1'],
    });
    expect(mockToastsAddSuccess).toHaveBeenCalled();
    expect(mockToastsAddDanger).not.toHaveBeenCalled();
  });

  it('leaves previews and validation failures to the editor without invalidating queries', async () => {
    const { result } = renderHook(() => useApplyDataStreamEdits(), { wrapper: createWrapper() });

    for (const response of [
      { status: 'preview', ingest_pipeline: {} },
      {
        status: 'failure',
        field_errors: [
          { name: 'port', issue: 'out_of_range', failing_documents: 1, total_documents: 1 },
        ],
      },
    ]) {
      mockApplyDataStreamEdits.mockResolvedValueOnce(response);
      await act(async () => {
        await result.current.applyDataStreamEditsMutation.mutateAsync({
          ...REQUEST,
          dryRun: response.status === 'preview',
        });
      });
    }

    expect(mockToastsAddDanger).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockToastsAddSuccess).not.toHaveBeenCalled();
  });

  it('shows an error toast and refetches the integration for failed saves, not failed previews', async () => {
    mockApplyDataStreamEdits.mockRejectedValue({ body: { message: 'Invalid ingest pipeline' } });
    const { result } = renderHook(() => useApplyDataStreamEdits(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(
        result.current.applyDataStreamEditsMutation.mutateAsync({ ...REQUEST, dryRun: true })
      ).rejects.toThrow('Invalid ingest pipeline');
    });
    expect(mockToastsAddDanger).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();

    await act(async () => {
      await expect(
        result.current.applyDataStreamEditsMutation.mutateAsync({ ...REQUEST, dryRun: false })
      ).rejects.toThrow('Invalid ingest pipeline');
    });
    expect(mockToastsAddDanger).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Invalid ingest pipeline' })
    );
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['integration', 'int-1'] });
  });
});
