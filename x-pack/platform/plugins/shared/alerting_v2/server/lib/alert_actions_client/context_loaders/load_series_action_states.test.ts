/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeSeriesId, type DecodedSeriesId } from '@kbn/alerting-v2-utils';
import { createQueryService } from '../../services/query_service/query_service.mock';
import {
  getEmptyESQLResponse,
  getSeriesActionStateESQLResponse,
} from '../fixtures/query_responses';
import { loadSeriesActionStatesBySeries } from './load_series_action_states';

const GROUP_HASH = 'a'.repeat(64);

const ruleSeries = (ruleId: string): DecodedSeriesId => ({
  kind: 'rule',
  space_id: 'default',
  rule_id: ruleId,
  group_hash: GROUP_HASH,
});

const sourceSeries = (source: string): DecodedSeriesId => ({
  kind: 'source',
  space_id: 'default',
  source,
  group_hash: GROUP_HASH,
});

const seriesIdOf = (series: DecodedSeriesId): string => {
  const seriesId = encodeSeriesId(series);
  if (seriesId === null) {
    throw new Error('Expected a series id');
  }
  return seriesId;
};

describe('loadSeriesActionStatesBySeries', () => {
  const SPACE_ID = 'default';

  const setup = () => createQueryService();

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('short-circuits on an empty input without issuing any ES|QL query', async () => {
    const { queryService, mockEsClient } = setup();

    const states = await loadSeriesActionStatesBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [],
    });

    expect(states.size).toBe(0);
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('issues a single query over the series snooze actions, filtering each series by its owner and hash', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getSeriesActionStateESQLResponse());

    await loadSeriesActionStatesBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('rule-a'), sourceSeries('pagerduty')],
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
    const { query } = mockEsClient.esql.query.mock.calls[0][0];
    expect(query).toContain('FROM .alert-actions');
    expect(query).toContain(`space_id == "${SPACE_ID}"`);
    expect(query).toContain('alert_id IS NULL');
    expect(query).toContain('action_type IN ("snooze", "unsnooze")');
    expect(query).toContain(
      `WHERE rule_id == "rule-a" AND group_hash == "${GROUP_HASH}" OR source == "pagerduty" AND group_hash == "${GROUP_HASH}"`
    );
    expect(query).toContain('EVAL series_id = ');
    expect(query).toContain('BY series_id');
  });

  it('keeps the snooze of each rule that shares a group_hash apart', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesActionStateESQLResponse([
        {
          series_id: seriesIdOf(ruleSeries('rule-a')),
          last_snooze_action: 'snooze',
          snoozed_until: null,
        },
        {
          series_id: seriesIdOf(ruleSeries('rule-b')),
          last_snooze_action: 'unsnooze',
          snoozed_until: null,
        },
      ])
    );

    const states = await loadSeriesActionStatesBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('rule-a'), ruleSeries('rule-b')],
    });

    expect(states.get(seriesIdOf(ruleSeries('rule-a')))).toEqual({
      snoozed: true,
      snoozed_until: null,
    });
    expect(states.get(seriesIdOf(ruleSeries('rule-b')))).toEqual({
      snoozed: false,
      snoozed_until: null,
    });
  });

  it('reads a series as snoozed only while its latest snooze/unsnooze is an unexpired snooze', async () => {
    const { queryService, mockEsClient } = setup();
    const indefinite = ruleSeries('indefinite');
    const untilLater = ruleSeries('until-later');
    const expired = ruleSeries('expired');
    const unsnoozed = ruleSeries('unsnoozed');
    mockEsClient.esql.query.mockResolvedValueOnce(
      getSeriesActionStateESQLResponse([
        { series_id: seriesIdOf(indefinite), last_snooze_action: 'snooze', snoozed_until: null },
        {
          series_id: seriesIdOf(untilLater),
          last_snooze_action: 'snooze',
          snoozed_until: '2026-01-02T00:00:00.000Z',
        },
        {
          series_id: seriesIdOf(expired),
          last_snooze_action: 'snooze',
          snoozed_until: '2026-01-01T00:00:00.000Z',
        },
        {
          series_id: seriesIdOf(unsnoozed),
          last_snooze_action: 'unsnooze',
          snoozed_until: '2026-01-02T00:00:00.000Z',
        },
      ])
    );

    const states = await loadSeriesActionStatesBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [indefinite, untilLater, expired, unsnoozed],
    });

    expect(states.get(seriesIdOf(indefinite))).toEqual({ snoozed: true, snoozed_until: null });
    expect(states.get(seriesIdOf(untilLater))).toEqual({
      snoozed: true,
      snoozed_until: '2026-01-02T00:00:00.000Z',
    });
    expect(states.get(seriesIdOf(expired))).toEqual({ snoozed: false, snoozed_until: null });
    expect(states.get(seriesIdOf(unsnoozed))).toEqual({ snoozed: false, snoozed_until: null });
  });

  it('returns an empty map when the series have no recorded snooze actions', async () => {
    const { queryService, mockEsClient } = setup();
    mockEsClient.esql.query.mockResolvedValueOnce(getEmptyESQLResponse());

    const states = await loadSeriesActionStatesBySeries({
      queryService,
      spaceId: SPACE_ID,
      series: [ruleSeries('rule-a')],
    });

    expect(states.size).toBe(0);
  });
});
