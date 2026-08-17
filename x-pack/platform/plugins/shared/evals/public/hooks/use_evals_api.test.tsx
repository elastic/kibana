/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useDataset, useDatasets, useDeleteDataset } from './use_evals_api';

const DATASET_ID = 'dataset-1';
const DATASET_URL = `/internal/evals/datasets/${DATASET_ID}`;
const DATASETS_URL = '/internal/evals/datasets';

const setup = () => {
  const http = httpServiceMock.createStartContract();
  http.get.mockResolvedValue({ id: DATASET_ID, name: 'a dataset', examples: [] });
  http.delete.mockResolvedValue({ deleted: true });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={{ http }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return { http, wrapper };
};

type Http = ReturnType<typeof httpServiceMock.createStartContract>;

// Widened because the mock types its first argument as an options object,
// while the hooks pass the path as a string.
const callsTo = (http: Http, url: string) =>
  (http.get.mock.calls as ReadonlyArray<readonly unknown[]>).filter(([path]) => path === url)
    .length;

describe('useDeleteDataset', () => {
  it('refreshes the list without refetching the dataset it deleted', async () => {
    const { http, wrapper } = setup();

    const { result } = renderHook(
      () => ({
        dataset: useDataset(DATASET_ID),
        datasets: useDatasets({ page: 1 }),
        deleteDataset: useDeleteDataset(),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.dataset.isSuccess).toBe(true));
    await waitFor(() => expect(result.current.datasets.isSuccess).toBe(true));
    expect(callsTo(http, DATASET_URL)).toBe(1);
    expect(callsTo(http, DATASETS_URL)).toBe(1);

    await result.current.deleteDataset.mutateAsync({ datasetId: DATASET_ID });

    await waitFor(() => expect(callsTo(http, DATASETS_URL)).toBe(2));
    // Refetching it would 404: the detail page is still mounted as it redirects.
    expect(callsTo(http, DATASET_URL)).toBe(1);
  });
});
