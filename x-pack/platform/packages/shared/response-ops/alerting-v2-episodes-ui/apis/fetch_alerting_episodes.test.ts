/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLVariableType } from '@kbn/esql-types';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Filter } from '@kbn/es-query';
import {
  buildEpisodeActionStateQuery,
  buildEpisodeDetailsQuery,
  buildEpisodesListQuery,
  buildEpisodesQuery,
} from '@kbn/alerting-v2-common-queries';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { buildAlertEventsTimeRangeFilter } from '../utils/build_alert_events_time_range_filter';
import { fetchAlertingEpisodes } from './fetch_alerting_episodes';

jest.mock('../utils/execute_esql_query');

const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);

const SPACE_ID = 'default';

describe('fetchAlertingEpisodes', () => {
  const mockExpressions = {} as ExpressionsStart;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecuteEsqlQuery.mockResolvedValue([]);
  });

  it('should call executeEsqlQuery with correct parameters', async () => {
    const pageSize = 10;
    const expectedQuery = buildEpisodesListQuery(SPACE_ID, {
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('should call executeEsqlQuery with different page size', async () => {
    const pageSize = 20;
    const expectedQuery = buildEpisodesListQuery(SPACE_ID, {
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('should call executeEsqlQuery with abort signal when provided', async () => {
    const pageSize = 15;
    const abortController = new AbortController();
    const abortSignal = abortController.signal;
    const expectedQuery = buildEpisodesListQuery(SPACE_ID, {
      sortField: '@timestamp',
      sortDirection: 'desc',
    }).print('basic');

    await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize,
      abortSignal,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal,
    });
  });

  it('should apply the time range to the alert events only, as a request filter', async () => {
    await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize: 10,
      timeRange: { from: '2026-09-10T10:00:00.000Z', to: '2026-09-10T12:00:00.000Z' },
      services: { expressions: mockExpressions },
    });

    const { input, timeField } = mockExecuteEsqlQuery.mock.calls[0][0] as {
      input: { timeRange?: unknown; filters?: Filter[] };
      timeField?: string;
    };
    expect(timeField).toBeUndefined();
    expect(input.timeRange).toBeUndefined();
    expect(input.filters).toHaveLength(1);
    expect(input.filters?.[0].query?.bool.should).toEqual([
      {
        bool: {
          filter: [
            { term: { type: 'alert' } },
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: '2026-09-10T10:00:00.000Z',
                  lte: '2026-09-10T12:00:00.000Z',
                },
              },
            },
          ],
        },
      },
      { exists: { field: 'action_type' } },
    ]);
  });

  it('should call executeEsqlQuery with custom sort parameters', async () => {
    const pageSize = 25;
    const sortState = {
      sortField: 'episode.status',
      sortDirection: 'asc' as const,
    };
    const expectedQuery = buildEpisodesListQuery(SPACE_ID, sortState).print('basic');

    await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize,
      sortState,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      expressions: mockExpressions,
      query: expectedQuery,
      input: {
        type: 'kibana_context',
        esqlVariables: [
          {
            key: 'pageSize',
            value: pageSize,
            type: ESQLVariableType.VALUES,
          },
        ],
      },
      abortSignal: undefined,
    });
  });

  it('completes the page rows with the per-page lookups', async () => {
    const t0 = '2026-01-01T10:00:00.000Z';
    const t1 = '2026-01-01T11:00:00.000Z';
    const t2 = '2026-01-01T12:00:00.000Z';
    // the list query only sees the events in range, so ep-1 looks like it started at t1
    const rows = [
      {
        'episode.id': 'ep-1',
        group_hash: 'hash-1',
        first_timestamp: t1,
        last_timestamp: t2,
        duration: 3_600_000,
      },
      {
        'episode.id': 'ep-2',
        group_hash: 'hash-1',
        first_timestamp: t1,
        last_timestamp: t2,
        duration: 3_600_000,
      },
      {
        'episode.id': 'ep-3',
        group_hash: 'hash-2',
        first_timestamp: t2,
        last_timestamp: t2,
        duration: 0,
      },
    ];
    const timeRange = { from: '2026-01-01T10:30:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    const timeRangeFilter = buildAlertEventsTimeRangeFilter(timeRange);
    mockExecuteEsqlQuery
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([
        {
          'episode.id': 'ep-1',
          first_timestamp: t0,
          last_timestamp: t2,
          triggered_at: t0,
          severity: 'high',
          episode_data: '{"a":1}',
        },
        {
          'episode.id': 'ep-2',
          first_timestamp: t1,
          last_timestamp: t2,
          triggered_at: null,
          severity: null,
          episode_data: '{}',
        },
        {
          'episode.id': 'ep-3',
          first_timestamp: t2,
          last_timestamp: t2,
          triggered_at: null,
          severity: null,
          episode_data: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          action_key: 'ep-2',
          last_ack_action: 'ack',
          last_assignee_uid: 'u1',
          last_tags: ['prod'],
        },
        {
          action_key: 'hash-1',
          last_snooze_action: 'snooze',
          snooze_expiry: '2026-01-01T00:00:00Z',
        },
      ]);

    const result = await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize: 10,
      timeRange,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
    expect(mockExecuteEsqlQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: buildEpisodesListQuery(SPACE_ID).print('basic'),
        input: expect.objectContaining({ filters: [timeRangeFilter] }),
      })
    );
    // the details cover the whole episode history: no time range filter
    expect(mockExecuteEsqlQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: buildEpisodeDetailsQuery(SPACE_ID, ['ep-1', 'ep-2', 'ep-3']).print('basic'),
        input: { type: 'kibana_context' },
      })
    );
    expect(mockExecuteEsqlQuery).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        query: buildEpisodeActionStateQuery(SPACE_ID, {
          episodeIds: ['ep-1', 'ep-2', 'ep-3'],
          groupHashes: ['hash-1', 'hash-2'],
        }).print('basic'),
        input: { type: 'kibana_context' },
      })
    );
    expect(result).toEqual([
      {
        'episode.id': 'ep-1',
        group_hash: 'hash-1',
        // exact boundaries from the details, not the range-clamped ones
        first_timestamp: t0,
        last_timestamp: t2,
        duration: 7_200_000,
        duration_is_lower_bound: false,
        triggered_at: t0,
        severity: 'high',
        episode_data: '{"a":1}',
        last_snooze_action: 'snooze',
        snooze_expiry: '2026-01-01T00:00:00Z',
        last_ack_action: null,
        last_assignee_uid: null,
        last_tags: null,
      },
      {
        'episode.id': 'ep-2',
        group_hash: 'hash-1',
        first_timestamp: t1,
        last_timestamp: t2,
        duration: 3_600_000,
        duration_is_lower_bound: false,
        triggered_at: null,
        severity: null,
        episode_data: '{}',
        last_snooze_action: 'snooze',
        snooze_expiry: '2026-01-01T00:00:00Z',
        last_ack_action: 'ack',
        last_assignee_uid: 'u1',
        last_tags: ['prod'],
      },
      {
        'episode.id': 'ep-3',
        group_hash: 'hash-2',
        first_timestamp: t2,
        last_timestamp: t2,
        duration: 0,
        duration_is_lower_bound: false,
        triggered_at: null,
        severity: null,
        episode_data: null,
        last_snooze_action: null,
        snooze_expiry: null,
        last_ack_action: null,
        last_assignee_uid: null,
        last_tags: null,
      },
    ]);
  });

  it('keeps the actions join in the list query when a filter needs the action state', async () => {
    const filterState = { tags: ['prod'] };
    const expectedQuery = buildEpisodesQuery(
      SPACE_ID,
      { sortField: '@timestamp', sortDirection: 'desc' },
      filterState
    ).print('basic');
    mockExecuteEsqlQuery.mockResolvedValueOnce([
      { 'episode.id': 'ep-1', group_hash: 'hash-1', last_tags: ['prod'] },
    ]);

    const result = await fetchAlertingEpisodes({
      spaceId: SPACE_ID,
      pageSize: 10,
      filterState,
      services: { expressions: mockExpressions },
    });

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: expectedQuery })
    );
    expect(result).toEqual([{ 'episode.id': 'ep-1', group_hash: 'hash-1', last_tags: ['prod'] }]);
  });
});
