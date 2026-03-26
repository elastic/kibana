/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Datatable, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { ALERTING_EPISODES_COUNT_QUERY } from '../constants';
import { useFetchAlertingEpisodesQuery } from './use_fetch_alerting_episodes_query';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';

jest.mock('../apis/fetch_alerting_episodes');
jest.mock('../utils/execute_esql_query');

const fetchAlertingEpisodesMock = jest.mocked(fetchAlertingEpisodes);
const executeEsqlQueryMock = jest.mocked(executeEsqlQuery);

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useFetchAlertingEpisodesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('should fetch total count on first page', async () => {
    const pageSize = 2;
    const totalCount = 4;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    expect(executeEsqlQueryMock).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: ALERTING_EPISODES_COUNT_QUERY,
      input: null,
      abortSignal: expect.any(AbortSignal),
    });
  });

  it('should fetch episodes data with correct page size', async () => {
    const pageSize = 20;
    const totalCount = 50;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(fetchAlertingEpisodesMock).toHaveBeenCalledWith({
      abortSignal: expect.any(AbortSignal),
      pageSize,
      beforeTimestamp: undefined,
      services: { dataViews, http, expressions: mockExpressions },
    });
  });

  it('should not fetch total count on subsequent pages', async () => {
    const pageSize = 10;
    const totalCount = 100;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => result.current.isSuccess);

    executeEsqlQueryMock.mockClear();

    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
    });

    expect(executeEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('should use timestamp from last row as cursor for next page', async () => {
    const pageSize = 10;
    const totalCount = 100;
    const lastTimestamp = '2024-03-01T09:00:00Z';

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue({
      rows: [
        { '@timestamp': '2024-03-01T10:00:00Z', 'episode.id': 'episode-1' },
        { '@timestamp': lastTimestamp, 'episode.id': 'episode-2' },
      ],
    } as unknown as Datatable);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => result.current.isSuccess);

    fetchAlertingEpisodesMock.mockClear();

    await result.current.fetchNextPage();

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
    });

    expect(fetchAlertingEpisodesMock).toHaveBeenCalledWith({
      abortSignal: expect.any(AbortSignal),
      pageSize,
      beforeTimestamp: lastTimestamp,
      services: { dataViews, http, expressions: mockExpressions },
    });
  });

  it('should return undefined for next page param when all data is fetched', async () => {
    const pageSize = 10;
    const totalCount = 2;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  it('should return next page param when more data is available', async () => {
    const pageSize = 10;
    const totalCount = 100;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
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
    const totalCount = 50;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => result.current.isSuccess);

    expect(result.current.dataView).toBe(mockDataView);
  });

  it('should handle total count of 0', async () => {
    const pageSize = 10;
    const totalCount = 0;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{ total: totalCount }],
    } as unknown as Datatable);
    fetchAlertingEpisodesMock.mockResolvedValue({
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

    await waitFor(() => {
      expect(result.current.data?.pages[0].total).toBe(0);
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle missing total in count query result', async () => {
    const pageSize = 10;

    executeEsqlQueryMock.mockResolvedValue({
      rows: [{}],
    } as any);
    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions },
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data?.pages[0].total).toBe(0);
    });
  });
});
