/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useUpdateDataStreamFieldTypes } from './use_update_data_stream_field_types';
import * as api from '../lib/api';

jest.mock('../lib/api');
const mockUpdateDataStreamFieldTypes = api.updateDataStreamFieldTypes as jest.Mock;

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

describe('useUpdateDataStreamFieldTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates data stream and integration queries after a successful save', async () => {
    mockUpdateDataStreamFieldTypes.mockResolvedValue({ status: 'saved', ingest_pipeline: {} });

    const { result } = renderHook(() => useUpdateDataStreamFieldTypes(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateDataStreamFieldTypesMutation.mutateAsync({
        integrationId: 'int-1',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        changes: [{ name: 'port', type: 'long' }],
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

  it('leaves validation failures to the inline editor without invalidating queries', async () => {
    mockUpdateDataStreamFieldTypes.mockResolvedValue({
      status: 'failure',
      errors: [{ name: 'port', issue: 'out_of_range', failing_documents: 1, total_documents: 1 }],
    });

    const { result } = renderHook(() => useUpdateDataStreamFieldTypes(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.updateDataStreamFieldTypesMutation.mutateAsync({
        integrationId: 'int-1',
        dataStreamId: 'ds-1',
        version: 'WzEsMV0=',
        changes: [{ name: 'port', type: 'long' }],
      });
    });

    expect(mockToastsAddDanger).not.toHaveBeenCalled();
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
    expect(mockToastsAddSuccess).not.toHaveBeenCalled();
  });
});
