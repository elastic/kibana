/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import {
  buildCollapsedStatusPhasesQuery,
  buildCollapsedSeverityPhasesQuery,
} from '@kbn/alerting-v2-common-queries';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeCollapsedEventsQuery } from './use_fetch_episode_collapsed_events_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const queryOptions = { spaceId: DEFAULT_SPACE_ID, alertIds: ['ep-1'] };
const phasesQueryString = buildCollapsedStatusPhasesQuery(queryOptions).print('basic');
const severityQueryString = buildCollapsedSeverityPhasesQuery(queryOptions).print('basic');

describe('useFetchEpisodeCollapsedEventsQuery', () => {
  const data = dataPluginMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const mockSpaces = createMockSpaces();
  const services = { data, notifications, spaces: mockSpaces };
  const eventCounts = { shownEventCount: 1000, totalEventCount: 5002 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it.each([
    ['disabled', { episodeId: 'ep-1', enabled: false }],
    ['missing the episode id', { episodeId: undefined, enabled: true }],
  ])('does not run when %s', (_label, options) => {
    const { result } = renderHook(
      () => useFetchEpisodeCollapsedEventsQuery({ ...options, ...eventCounts, services }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('scopes the collapsed queries by space and episode, without a rule filter', () => {
    expect(phasesQueryString).toContain(`space_id == "${DEFAULT_SPACE_ID}"`);
    expect(phasesQueryString).not.toContain('rule.id');
    expect(severityQueryString).toContain(`space_id == "${DEFAULT_SPACE_ID}"`);
    expect(severityQueryString).not.toContain('rule.id');
  });

  it('sweeps the Gantt phase rows into timeline changes, oldest first', async () => {
    runEsqlAsyncSearchMock.mockImplementation(async ({ params }) =>
      params.query === phasesQueryString
        ? {
            columns: [
              { name: 'episode.id', type: 'keyword' },
              { name: 'episode.status', type: 'keyword' },
              { name: 'group_hash', type: 'keyword' },
              { name: 'seg_start', type: 'date' },
              { name: 'seg_end', type: 'date' },
              { name: 'event_count', type: 'long' },
            ],
            values: [
              [
                'ep-1',
                ALERT_EPISODE_STATUS.ACTIVE,
                'hash-1',
                '2024-01-01T00:01:00.000Z',
                '2024-01-02T00:00:00.000Z',
                5000,
              ],
              [
                'ep-1',
                ALERT_EPISODE_STATUS.PENDING,
                'hash-1',
                '2024-01-01T00:00:00.000Z',
                '2024-01-01T00:00:30.000Z',
                2,
              ],
            ],
          }
        : {
            columns: [
              { name: 'episode.id', type: 'keyword' },
              { name: 'severity', type: 'keyword' },
              { name: 'seg_start', type: 'date' },
              { name: 'seg_end', type: 'date' },
              { name: 'event_count', type: 'long' },
            ],
            values: [
              ['ep-1', 'critical', '2024-01-01T12:00:00.000Z', '2024-01-01T12:10:00.000Z', 10],
              ['ep-1', 'high', '2024-01-01T00:00:00.000Z', '2024-01-02T00:00:00.000Z', 4992],
            ],
          }
    );

    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({
          episodeId: 'ep-1',
          enabled: true,
          ...eventCounts,
          services,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ query: phasesQueryString }) })
    );
    expect(runEsqlAsyncSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ query: severityQueryString }) })
    );
    expect(result.current.data).toEqual({
      statusRows: [
        {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          'episode.id': 'ep-1',
          'episode.status': ALERT_EPISODE_STATUS.PENDING,
          group_hash: 'hash-1',
        },
        {
          '@timestamp': '2024-01-01T00:01:00.000Z',
          'episode.id': 'ep-1',
          'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
          group_hash: 'hash-1',
        },
      ],
      // `high` is still open when `critical` ends, so it becomes the current severity again.
      severityRows: [
        { '@timestamp': '2024-01-01T00:00:00.000Z', severity: 'high' },
        { '@timestamp': '2024-01-01T12:00:00.000Z', severity: 'critical' },
        { '@timestamp': '2024-01-01T12:10:00.000Z', severity: 'high' },
      ],
    });
  });

  it('ends on the status that is still open for a flapping alert', async () => {
    runEsqlAsyncSearchMock.mockImplementation(async ({ params }) =>
      params.query === phasesQueryString
        ? {
            columns: [
              { name: 'episode.id', type: 'keyword' },
              { name: 'episode.status', type: 'keyword' },
              { name: 'group_hash', type: 'keyword' },
              { name: 'seg_start', type: 'date' },
              { name: 'seg_end', type: 'date' },
              { name: 'event_count', type: 'long' },
            ],
            // Recovering started after active did, but active was seen again afterwards.
            values: [
              [
                'ep-1',
                ALERT_EPISODE_STATUS.PENDING,
                'hash-1',
                '2024-01-01T00:00:00.000Z',
                '2024-01-01T00:00:00.000Z',
                1,
              ],
              [
                'ep-1',
                ALERT_EPISODE_STATUS.ACTIVE,
                'hash-1',
                '2024-01-01T00:01:00.000Z',
                '2024-01-01T00:06:00.000Z',
                4,
              ],
              [
                'ep-1',
                ALERT_EPISODE_STATUS.RECOVERING,
                'hash-1',
                '2024-01-01T00:04:00.000Z',
                '2024-01-01T00:04:00.000Z',
                1,
              ],
            ],
          }
        : {
            columns: [
              { name: 'episode.id', type: 'keyword' },
              { name: 'severity', type: 'keyword' },
              { name: 'seg_start', type: 'date' },
              { name: 'seg_end', type: 'date' },
              { name: 'event_count', type: 'long' },
            ],
            values: [['ep-1', 'high', '2024-01-01T00:00:00.000Z', '2024-01-01T00:06:00.000Z', 6]],
          }
    );

    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({
          episodeId: 'ep-1',
          enabled: true,
          ...eventCounts,
          services,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      result.current.data?.statusRows.map((row) => [row['@timestamp'], row['episode.status']])
    ).toEqual([
      ['2024-01-01T00:00:00.000Z', ALERT_EPISODE_STATUS.PENDING],
      ['2024-01-01T00:01:00.000Z', ALERT_EPISODE_STATUS.ACTIVE],
      ['2024-01-01T00:04:00.000Z', ALERT_EPISODE_STATUS.RECOVERING],
      ['2024-01-01T00:04:00.000Z', ALERT_EPISODE_STATUS.ACTIVE],
    ]);
  });

  it('retries a failed load, then toasts the error', async () => {
    const error = new Error('search failed');
    runEsqlAsyncSearchMock.mockRejectedValue(error);
    const retryWrapper = createQueryClientWrapper(
      createTestQueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
    );

    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({
          episodeId: 'ep-1',
          enabled: true,
          ...eventCounts,
          services,
        }),
      { wrapper: retryWrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Two queries per attempt: the first try and two retries.
    expect(runEsqlAsyncSearchMock).toHaveBeenCalledTimes(6);
    expect(notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Could not load the full history for this alert',
      toastMessage:
        'The timeline shows 1000 of 5002 events, so the latest status and severity may be missing.',
    });
  });

  it('does not toast an aborted load', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    runEsqlAsyncSearchMock.mockRejectedValue(abortError);
    const retryWrapper = createQueryClientWrapper(
      createTestQueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
    );

    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({
          episodeId: 'ep-1',
          enabled: true,
          ...eventCounts,
          services,
        }),
      { wrapper: retryWrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notifications.toasts.addError).not.toHaveBeenCalled();
  });
});
