/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook } from '@testing-library/react';

import { useScanUsage } from './use_scan_usage';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockDelete = jest.fn().mockResolvedValue({
  acknowledge: true,
  error_message: 'inference id is being used',
  indexes: ['index1', 'index2'],
  pipelines: ['pipeline1', 'pipeline2'],
});
const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useScanUsage', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          delete: mockDelete,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call API endpoint with the correct parameters and return response', async () => {
    const { result } = renderHook(
      () =>
        useScanUsage({
          type: 'text_embedding',
          id: 'in-1',
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(
        '/internal/inference_endpoint/endpoints/text_embedding/in-1',
        { query: { scanUsage: true } }
      );

      expect(result.current.data).toEqual({
        acknowledge: true,
        error_message: 'inference id is being used',
        indexes: ['index1', 'index2'],
        pipelines: ['pipeline1', 'pipeline2'],
      });
    });
  });
});
