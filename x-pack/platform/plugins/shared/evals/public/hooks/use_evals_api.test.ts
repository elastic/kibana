/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { GetEvaluationDatasetResponse } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';
import { useDeleteExample, useUpdateExample } from './use_evals_api';

const mockHttp = {
  delete: jest.fn(),
  put: jest.fn(),
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: { http: mockHttp },
  }),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const datasetId = 'dataset-1';
const exampleIdA = 'example-a';
const exampleIdB = 'example-b';

const buildDataset = (
  examples: GetEvaluationDatasetResponse['examples'] = []
): GetEvaluationDatasetResponse => ({
  id: datasetId,
  name: 'Test Dataset',
  description: 'A test dataset',
  examples,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const exampleA: GetEvaluationDatasetResponse['examples'][number] = {
  id: exampleIdA,
  input: { question: 'What is Kibana?' },
  output: { answer: 'A data visualization tool' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const exampleB: GetEvaluationDatasetResponse['examples'][number] = {
  id: exampleIdB,
  input: { question: 'What is Elasticsearch?' },
  output: { answer: 'A search engine' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('useDeleteExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('optimistically removes the deleted example from the cached dataset', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.datasets.detail(datasetId),
      buildDataset([exampleA, exampleB])
    );

    mockHttp.delete.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useDeleteExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ datasetId, exampleId: exampleIdA });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    expect(cached?.examples).toHaveLength(1);
    expect(cached?.examples[0].id).toBe(exampleIdB);
  });

  it('does not throw when dataset is not in the cache', async () => {
    const queryClient = createTestQueryClient();

    mockHttp.delete.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useDeleteExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ datasetId, exampleId: exampleIdA });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    expect(cached).toBeUndefined();
  });

  it('invalidates the datasets list query after delete', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.datasets.detail(datasetId), buildDataset([exampleA]));

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockHttp.delete.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useDeleteExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ datasetId, exampleId: exampleIdA });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['evals', 'datasets', 'list'],
    });
    invalidateSpy.mockRestore();
  });

  it('does not refetch the dataset detail query after delete', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.datasets.detail(datasetId), buildDataset([exampleA]));

    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockHttp.delete.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useDeleteExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ datasetId, exampleId: exampleIdA });
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]);
    expect(invalidatedKeys).not.toContainEqual(
      expect.objectContaining({
        queryKey: queryKeys.datasets.detail(datasetId),
      })
    );
    expect(invalidatedKeys).not.toContainEqual(
      expect.objectContaining({
        queryKey: queryKeys.datasets.all,
      })
    );
    invalidateSpy.mockRestore();
  });
});

describe('useUpdateExample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('optimistically updates the example in the cached dataset', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.datasets.detail(datasetId),
      buildDataset([exampleA, exampleB])
    );

    const updatedResponse = {
      id: exampleIdA,
      dataset_id: datasetId,
      input: { question: 'Updated question' },
      output: { answer: 'Updated answer' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    mockHttp.put.mockResolvedValueOnce(updatedResponse);

    const { result } = renderHook(() => useUpdateExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        datasetId,
        exampleId: exampleIdA,
        updates: { input: { question: 'Updated question' }, output: { answer: 'Updated answer' } },
      });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    expect(cached?.examples).toHaveLength(2);
    const updated = cached?.examples.find((e) => e.id === exampleIdA);
    expect(updated?.input).toEqual({ question: 'Updated question' });
    expect(updated?.output).toEqual({ answer: 'Updated answer' });
    expect(updated?.updated_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('does not include dataset_id in the cached example', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(queryKeys.datasets.detail(datasetId), buildDataset([exampleA]));

    const updatedResponse = {
      id: exampleIdA,
      dataset_id: datasetId,
      input: { question: 'New' },
      output: { answer: 'New' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    };
    mockHttp.put.mockResolvedValueOnce(updatedResponse);

    const { result } = renderHook(() => useUpdateExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        datasetId,
        exampleId: exampleIdA,
        updates: { input: { question: 'New' } },
      });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    const updated = cached?.examples.find((e) => e.id === exampleIdA);
    expect(updated).not.toHaveProperty('dataset_id');
  });

  it('does not throw when dataset is not in the cache', async () => {
    const queryClient = createTestQueryClient();

    mockHttp.put.mockResolvedValueOnce({
      id: exampleIdA,
      dataset_id: datasetId,
      input: { question: 'New' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUpdateExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        datasetId,
        exampleId: exampleIdA,
        updates: { input: { question: 'New' } },
      });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    expect(cached).toBeUndefined();
  });

  it('leaves other examples unchanged', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.datasets.detail(datasetId),
      buildDataset([exampleA, exampleB])
    );

    mockHttp.put.mockResolvedValueOnce({
      id: exampleIdA,
      dataset_id: datasetId,
      input: { question: 'Changed' },
      output: exampleA.output,
      created_at: exampleA.created_at,
      updated_at: '2026-01-02T00:00:00.000Z',
    });

    const { result } = renderHook(() => useUpdateExample(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        datasetId,
        exampleId: exampleIdA,
        updates: { input: { question: 'Changed' } },
      });
    });

    const cached = queryClient.getQueryData<GetEvaluationDatasetResponse>(
      queryKeys.datasets.detail(datasetId)
    );
    const unchanged = cached?.examples.find((e) => e.id === exampleIdB);
    expect(unchanged).toEqual(exampleB);
  });
});
