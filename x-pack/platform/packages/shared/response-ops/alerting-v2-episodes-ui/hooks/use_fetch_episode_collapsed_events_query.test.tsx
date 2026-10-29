/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  buildAlertPhasesQuery,
  buildAlertSeverityPhasesQuery,
} from '@kbn/alerting-v2-common-queries';
import { runEsqlAsyncSearch } from '../utils/run_esql_async_search';
import { createMockSpaces, createQueryClientWrapper, createTestQueryClient } from './test_utils';
import { useFetchEpisodeCollapsedEventsQuery } from './use_fetch_episode_collapsed_events_query';

jest.mock('../utils/run_esql_async_search');

const runEsqlAsyncSearchMock = jest.mocked(runEsqlAsyncSearch);

const queryClient = createTestQueryClient();
const wrapper = createQueryClientWrapper(queryClient);

const queryOptions = { ruleId: 'rule-1', alertIds: ['ep-1'] };
const phasesQueryString = buildAlertPhasesQuery(queryOptions).print('basic');
const severityQueryString = buildAlertSeverityPhasesQuery(queryOptions).print('basic');

describe('useFetchEpisodeCollapsedEventsQuery', () => {
  const data = dataPluginMock.createStartContract();
  const mockSpaces = createMockSpaces();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it.each([
    ['disabled', { episodeId: 'ep-1', ruleId: 'rule-1', enabled: false }],
    ['missing the episode id', { episodeId: undefined, ruleId: 'rule-1', enabled: true }],
    ['missing the rule id', { episodeId: 'ep-1', ruleId: undefined, enabled: true }],
  ])('does not run when %s', (_label, options) => {
    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({ ...options, services: { data, spaces: mockSpaces } }),
      { wrapper }
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(runEsqlAsyncSearchMock).not.toHaveBeenCalled();
  });

  it('maps the Gantt phase rows to timeline rows, oldest first', async () => {
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
              { name: 'event_count', type: 'long' },
            ],
            values: [
              ['ep-1', 'critical', '2024-01-01T12:00:00.000Z', 10],
              ['ep-1', 'high', '2024-01-01T00:00:00.000Z', 4992],
            ],
          }
    );

    const { result } = renderHook(
      () =>
        useFetchEpisodeCollapsedEventsQuery({
          episodeId: 'ep-1',
          ruleId: 'rule-1',
          enabled: true,
          services: { data, spaces: mockSpaces },
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
          event_count: 2,
        },
        {
          '@timestamp': '2024-01-01T00:01:00.000Z',
          'episode.id': 'ep-1',
          'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
          group_hash: 'hash-1',
          event_count: 5000,
        },
      ],
      severityRows: [
        { '@timestamp': '2024-01-01T00:00:00.000Z', severity: 'high', event_count: 4992 },
        { '@timestamp': '2024-01-01T12:00:00.000Z', severity: 'critical', event_count: 10 },
      ],
    });
  });
});
