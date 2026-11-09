/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { encodeSeriesId, type DecodedSeriesId } from '@kbn/alerting-v2-utils';
import {
  getAlertEventESQLResponse,
  getEmptyESQLResponse,
  getSeriesEventESQLResponse,
} from '../fixtures/query_responses';
import {
  loadLastEpisodeAlertEventOrThrow,
  loadLastSeriesAlertEventOrThrow,
  loadLatestAlertEventsByEpisodeId,
  loadLatestAlertEventsBySeries,
} from './load_latest_alert_events';

const GROUP_HASH = 'a'.repeat(64);
const OTHER_GROUP_HASH = 'b'.repeat(64);

const ruleSeries = (ruleId: string, groupHash = GROUP_HASH): DecodedSeriesId => ({
  kind: 'rule',
  space_id: 'default',
  rule_id: ruleId,
  group_hash: groupHash,
});

const sourceSeries = (source: string, groupHash = GROUP_HASH): DecodedSeriesId => ({
  kind: 'source',
  space_id: 'default',
  source,
  group_hash: groupHash,
});

const seriesIdOf = (series: DecodedSeriesId): string => {
  const seriesId = encodeSeriesId(series);
  if (seriesId === null) {
    throw new Error('Expected a series id');
  }
  return seriesId;
};

describe('loadLatestAlertEventsBySeries', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('short-circuits on an empty input without issuing any ES|QL query', async () => {
    const { queryService, mockEsClient } = setup();

    const events = await loadLatestAlertEventsBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [],
    });

    expect(events.size).toBe(0);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('issues a single query filtering each series by its owner and hash, grouped by series id', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    await loadLatestAlertEventsBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [
        ruleSeries('rule-a'),
        ruleSeries('rule-b', OTHER_GROUP_HASH),
        sourceSeries('pagerduty'),
      ],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('FROM .rule-events METADATA _source');
    expect(query).toContain(`type == "alert" AND space_id == "${SPACE_ID}"`);
    expect(query).toContain(
      `WHERE rule.id == "rule-a" AND group_hash == "${GROUP_HASH}" OR rule.id == "rule-b" AND group_hash == "${OTHER_GROUP_HASH}" OR source == "pagerduty" AND group_hash == "${GROUP_HASH}"`
    );
    expect(query).toContain('EVAL series_id = ');
    expect(query).toContain('`rule.id`');
    expect(query).toContain('group_hash = LAST(group_hash, @timestamp)');
    expect(query).toContain('space_id = LAST(space_id, @timestamp)');
    expect(query).toMatch(/BY series_id`?\s*\|/);
    expect(query).not.toContain('rule_id, "::"');
  });

  it('keeps each series own events even when they share a group_hash', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([
        { group_hash: GROUP_HASH, rule_id: 'rule-a', episode_id: 'episode-a' },
        { group_hash: GROUP_HASH, rule_id: 'rule-b', episode_id: 'episode-b' },
      ])
    );

    const events = await loadLatestAlertEventsBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('rule-a'), ruleSeries('rule-b')],
    });

    expect(events.size).toBe(2);
    expect(events.get(seriesIdOf(ruleSeries('rule-a')))).toMatchObject({
      episode_id: 'episode-a',
      rule_id: 'rule-a',
    });
    expect(events.get(seriesIdOf(ruleSeries('rule-b')))).toMatchObject({
      episode_id: 'episode-b',
      rule_id: 'rule-b',
    });
  });

  it('maps returned rows into the canonical `AlertEventRecord` shape, without the series id column', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([
        { group_hash: GROUP_HASH, episode_id: 'ep-1', data_json: '{"k":"v"}' },
      ])
    );

    const events = await loadLatestAlertEventsBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('test-rule-id')],
    });

    const event = events.get(seriesIdOf(ruleSeries('test-rule-id')));
    expect(event).toMatchObject({
      group_hash: GROUP_HASH,
      episode_id: 'ep-1',
      data_json: { k: 'v' },
    });
    expect(event).not.toHaveProperty('series_id');
  });

  it('omits series without a matching event', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([{ group_hash: GROUP_HASH, rule_id: 'rule-a' }])
    );

    const events = await loadLatestAlertEventsBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('rule-a'), ruleSeries('rule-without-events')],
    });

    expect([...events.keys()]).toEqual([seriesIdOf(ruleSeries('rule-a'))]);
  });
});

describe('loadLatestAlertEventsByEpisodeId', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('short-circuits on an empty input without issuing any ES|QL query', async () => {
    const { queryService, mockEsClient } = setup();

    const events = await loadLatestAlertEventsByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: [],
    });

    expect(events).toEqual([]);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('issues a single query keyed by a deduplicated episode.id IN clause, grouped per episode', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([{ episode_id: 'ep-1' }, { episode_id: 'ep-2' }])
    );

    await loadLatestAlertEventsByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1', 'ep-2', 'ep-1'],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('FROM ".rule-events" METADATA _source');
    expect(query).toContain(`space_id == "${SPACE_ID}"`);
    expect(query).toMatch(/episode.id IN \("ep-1",\s*"ep-2"\)/);
    expect(query).toContain('BY episode_id, space_id');
    // group_hash is aggregated off the episode's own events, not a BY key.
    expect(query).toContain('group_hash = LAST(group_hash, @timestamp)');
  });

  it('maps returned rows into the canonical `AlertEventRecord` shape', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([
        { episode_id: 'ep-1', group_hash: 'resolved-group', data_json: '{"k":"v"}' },
      ])
    );

    const events = await loadLatestAlertEventsByEpisodeId({
      queryService,
      spaceId: SPACE_ID,
      episodeIds: ['ep-1'],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      episode_id: 'ep-1',
      group_hash: 'resolved-group',
      data_json: { k: 'v' },
    });
  });
});

describe('loadLastSeriesAlertEventOrThrow', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('returns the latest event of the series on a non-empty response', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([{ group_hash: GROUP_HASH, episode_id: 'ep-1' }])
    );
    const series = ruleSeries('test-rule-id');

    const record = await loadLastSeriesAlertEventOrThrow({
      queryService,
      spaceId: SPACE_ID,
      seriesId: seriesIdOf(series),
      series,
    });

    expect(record).toMatchObject({ group_hash: GROUP_HASH, episode_id: 'ep-1' });
  });

  it('picks the requested series when the filter also matched events of another series', async () => {
    const { queryService, mockEsClient } = setup();
    // The same rule id and hash with an external source is grouped apart by ES|QL; it comes first.
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([
        { group_hash: GROUP_HASH, rule_id: 'rule-a', source: 'scout-test', episode_id: 'other' },
        { group_hash: GROUP_HASH, rule_id: 'rule-a', source: 'internal', episode_id: 'requested' },
      ])
    );
    const series = ruleSeries('rule-a');

    const record = await loadLastSeriesAlertEventOrThrow({
      queryService,
      spaceId: SPACE_ID,
      seriesId: seriesIdOf(series),
      series,
    });

    expect(record).toMatchObject({ episode_id: 'requested', source: 'internal' });
  });

  it('throws `ALERT_EVENT_NOT_FOUND` when only another series matched the filter', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesEventESQLResponse([
        { group_hash: GROUP_HASH, rule_id: 'rule-a', source: 'scout-test', episode_id: 'other' },
      ])
    );
    const series = ruleSeries('rule-a');
    const seriesId = seriesIdOf(series);

    await expect(
      loadLastSeriesAlertEventOrThrow({ queryService, spaceId: SPACE_ID, seriesId, series })
    ).rejects.toMatchObject({
      output: { statusCode: 404 },
      data: {
        code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
        details: { series_id: seriesId },
      },
    });
  });

  it('throws `Boom.notFound` with `ALERT_EVENT_NOT_FOUND` and only the series_id detail', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());
    const series = ruleSeries('unknown-rule');
    const seriesId = seriesIdOf(series);

    const promise = loadLastSeriesAlertEventOrThrow({
      queryService,
      spaceId: SPACE_ID,
      seriesId,
      series,
    });

    await expect(promise).rejects.toThrow(Boom.Boom);
    await expect(promise).rejects.toMatchObject({
      output: { statusCode: 404 },
      data: {
        code: ALERTING_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
        details: { series_id: seriesId },
      },
    });
  });
});

describe('loadLastEpisodeAlertEventOrThrow', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  it('returns the latest event of the episode on a non-empty response', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getAlertEventESQLResponse([{ episode_id: 'ep-1', group_hash: 'resolved-group' }])
    );

    const record = await loadLastEpisodeAlertEventOrThrow({
      queryService,
      spaceId: SPACE_ID,
      episodeId: 'ep-1',
    });

    expect(record).toMatchObject({ episode_id: 'ep-1', group_hash: 'resolved-group' });
  });

  it('throws `Boom.notFound` with `ALERT_NOT_FOUND` and only the alert_id detail', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    const promise = loadLastEpisodeAlertEventOrThrow({
      queryService,
      spaceId: SPACE_ID,
      episodeId: 'unknown-episode',
    });

    await expect(promise).rejects.toThrow(Boom.Boom);
    await expect(promise).rejects.toMatchObject({
      output: { statusCode: 404 },
      data: {
        code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
        details: { alert_id: 'unknown-episode' },
      },
    });
  });
});
