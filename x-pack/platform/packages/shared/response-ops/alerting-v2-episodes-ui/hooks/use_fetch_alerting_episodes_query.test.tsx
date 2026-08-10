/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { fetchAlertingEpisodes } from '../apis/fetch_alerting_episodes';
import { fetchV1AlertsAsEpisodes } from '../apis/classic_alerts_api';
import { useFetchAlertingEpisodesQuery } from './use_fetch_alerting_episodes_query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useAlertingEpisodesDataView } from './use_alerting_episodes_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AlertEpisode } from '../queries/episodes_query';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';

jest.mock('../apis/fetch_alerting_episodes');
jest.mock('../apis/classic_alerts_api');

const fetchAlertingEpisodesMock = jest.mocked(fetchAlertingEpisodes);
// Classic (v1) alerts are a best-effort overlay; default to none so the existing
// v2-only expectations are preserved.
const fetchV1AlertsAsEpisodesMock = jest.mocked(fetchV1AlertsAsEpisodes);
fetchV1AlertsAsEpisodesMock.mockResolvedValue([]);

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
const mockSpaces = createMockSpaces();

const mockEpisodesData: AlertEpisode[] = [
  {
    '@timestamp': '2024-03-01T10:00:00Z',
    'episode.id': 'episode-1',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'gh-1',
    first_timestamp: '2024-03-01T10:00:00Z',
    last_timestamp: '2024-03-01T10:00:00Z',
    duration: 0,
  },
  {
    '@timestamp': '2024-03-01T09:00:00Z',
    'episode.id': 'episode-2',
    'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
    'rule.id': 'rule-1',
    group_hash: 'gh-2',
    first_timestamp: '2024-03-01T09:00:00Z',
    last_timestamp: '2024-03-01T09:00:00Z',
    duration: 0,
  },
];

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

describe('useFetchAlertingEpisodesQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchV1AlertsAsEpisodesMock.mockResolvedValue([]);
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
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
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
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
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
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.dataView).toBe(mockDataView);
  });

  it('should handle empty results', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue([]);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('normalizes last_tags from ES|QL to string[] in select', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue([
      {
        ...mockEpisodesData[0],
        last_tags: 'solo',
      },
    ]);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.[0].last_tags).toEqual(['solo']);
  });

  it('should use keepPreviousData for smooth transitions', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);

    const { result, rerender } = renderHook(
      ({ size }) =>
        useFetchAlertingEpisodesQuery({
          pageSize: size,
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
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

  it('merges classic (v1) episodes with v2 episodes sorted by timestamp', async () => {
    const pageSize = 10;

    const v1Episodes: AlertEpisode[] = [
      {
        '@timestamp': '2024-03-01T11:00:00Z',
        'episode.id': 'v1-episode-1',
        'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
        'rule.id': 'v1-rule-1',
        group_hash: 'v1-gh-1',
        first_timestamp: '2024-03-01T11:00:00Z',
        last_timestamp: '2024-03-01T11:00:00Z',
        duration: 0,
        supports_actions: false,
        supports_timeline: false,
      },
    ];

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);
    fetchV1AlertsAsEpisodesMock.mockResolvedValue(v1Episodes);

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0]['episode.id']).toBe('v1-episode-1');
    expect(result.current.data![0].supports_actions).toBe(false);
  });

  it('returns v2-only episodes when v1 fetch fails gracefully', async () => {
    const pageSize = 10;

    fetchAlertingEpisodesMock.mockResolvedValue(mockEpisodesData);
    fetchV1AlertsAsEpisodesMock.mockRejectedValue(new Error('v1 failure'));

    const { result } = renderHook(
      () =>
        useFetchAlertingEpisodesQuery({
          pageSize,
          services: { dataViews, http, expressions: mockExpressions, spaces: mockSpaces },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(mockEpisodesData.length);
    expect(result.current.data?.map((ep) => ep['episode.id'])).toEqual(
      mockEpisodesData.map((ep) => ep['episode.id'])
    );
  });
});
