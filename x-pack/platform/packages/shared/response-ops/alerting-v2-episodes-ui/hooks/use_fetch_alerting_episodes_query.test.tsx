/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { Datatable, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { useFetchAlertingEpisodesQuery } from './use_fetch_alerting_episodes_query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createQueryClientWrapper, createTestQueryClient } from './test_utils';

jest.mock('../apis/fetch_alerting_episodes');

const fetchAlertingEpisodesMock = jest.mocked(fetchAlertingEpisodes);

jest.mock('./use_alerting_episodes_data_view');
const mockDataView = {
  fields: [{ name: '@timestamp' }, { name: 'episode.id' }],
  setFieldCustomLabel: jest.fn(),
  setFieldFormat: jest.fn(),
  addRuntimeField: jest.fn(),
};
const mockUseAlertingEpisodesDataView = jest
  .mocked(useAlertingEpisodesDataView)
  .mockReturnValue(mockDataView as unknown as DataView);

const http = httpServiceMock.createStartContract();
const { dataViews } = dataPluginMock.createStartContract();
const mockExpressions = {} as ExpressionsStart;

const mockEpisodesData = {
  rows: [
    { '@timestamp': '2024-03-01T10:00:00Z', 'episode.id': 'episode-1' },
    { '@timestamp': '2024-03-01T09:00:00Z', 'episode.id': 'episode-2' },
  ],
} as unknown as Datatable;

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchAlertingEpisodesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch episodes data with correct page size', async () => {
    const pageSize = 20;

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchAlertingEpisodesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize,
        services: expect.objectContaining({ expressions: mockExpressions }),
      })
    );
  });

  it('should be disabled when data view is not available', () => {
    mockUseAlertingEpisodesDataView.mockReturnValueOnce(undefined);
    const pageSize = 10;

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('should return data view along with query result', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.dataView).toBe(mockDataView);
  });

  it('should handle empty results', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue({
      type: 'datatable' as const,
      columns: [],
      rows: [],
    } as unknown as Datatable);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.rows).toEqual([]);
  });

  it('should use keepPreviousData for smooth transitions', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result, rerender } = renderHook(
      ({ size }) =>
        useFetchAlertingEpisodesQuery({
          pageSize: size,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper, initialProps: { size: pageSize } }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const firstData = result.current.data;

    // Change page size to trigger refetch
    rerender({ size: pageSize + 10 });

    // Previous data should still be available during fetch
    expect(result.current.data).toBe(firstData);
  });
});
