/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { FetchEpisodesStep, parseDataJson, parseAlertEpisodes } from './fetch_episodes_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createDispatchableAlertEventsResponse } from '../fixtures/dispatcher';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';
import {
  LOOKBACK_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_LOOKBACK_CAP_MINUTES,
} from '../constants';

interface TimestampRange {
  gte?: string;
  gt?: string;
  lte?: string;
}

function extractTimestampRange(esqlRequest: unknown): TimestampRange {
  const filter = (esqlRequest as { filter: { range: Record<string, TimestampRange> } }).filter;
  return filter.range['@timestamp'];
}

describe('FetchEpisodesStep', () => {
  it('returns episodes and continues when episodes are found', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    const episodes = [
      createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
      createAlertEpisode({ rule_id: 'r2', group_hash: 'h2', episode_id: 'e2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(episodes));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes).toHaveLength(2);
    expect(result.data?.episodes?.[0].rule_id).toBe('r1');
  });

  it('anchors nextEventWatermark to the last_event_timestamp of the latest returned episode', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    // Returned in SORT-asc order; the last element's last_event_timestamp
    // must be what the watermark anchors to.
    const episodes = [
      createAlertEpisode({ episode_id: 'e1', last_event_timestamp: '2026-01-22T07:10:00.000Z' }),
      createAlertEpisode({ episode_id: 'e2', last_event_timestamp: '2026-01-22T07:10:30.000Z' }),
      createAlertEpisode({ episode_id: 'e3', last_event_timestamp: '2026-01-22T07:10:45.000Z' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(episodes));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.nextEventWatermark).toBe('2026-01-22T07:10:45.000Z');
  });

  it('continues a LIMIT-truncated tick from the last observed timestamp on the next run', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    // First tick: simulate a full LIMIT page; last episode's timestamp is the
    // boundary the next tick must resume from.
    const firstPage = [
      createAlertEpisode({ episode_id: 'e1', last_event_timestamp: '2026-01-22T07:10:00.000Z' }),
      createAlertEpisode({ episode_id: 'e2', last_event_timestamp: '2026-01-22T07:10:30.000Z' }),
    ];
    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(firstPage));

    const firstResult = await step.execute(createDispatcherPipelineState());
    expect(firstResult.type).toBe('continue');
    if (firstResult.type !== 'continue') return;
    const watermarkAfterFirst = firstResult.data?.nextEventWatermark;
    expect(watermarkAfterFirst).toBe('2026-01-22T07:10:30.000Z');

    // Second tick: re-feed the watermark; the lower bound must be `gte` so
    // any episode whose `last_event_timestamp` ties the boundary is picked up.
    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));
    await step.execute(
      createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: new Date(watermarkAfterFirst as string),
        },
      })
    );

    const range = extractTimestampRange(mockEsClient.esql.query.mock.calls[1][0]);
    expect(range).toHaveProperty('gte', watermarkAfterFirst);
    expect(range).not.toHaveProperty('gt');
  });

  it('parses data_json into data on episodes', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    const episodes = [
      {
        ...createAlertEpisode({ rule_id: 'r1' }),
        data_json: JSON.stringify({ severity: 'critical', host: 'server-01' }),
      },
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(episodes));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes?.[0].data).toEqual({
      severity: 'critical',
      host: 'server-01',
    });
  });

  it('omits data when data_json is null', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    const episodes = [{ ...createAlertEpisode({ rule_id: 'r1' }), data_json: null }];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(episodes));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes?.[0].data).toBeUndefined();
  });

  it('halts with no_episodes when none are found', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('halt');
    if (result.type !== 'halt') return;
    expect(result.reason).toBe('no_episodes');
    // Even on an empty queried window the watermark must advance, otherwise
    // the next tick would re-read the same empty range forever.
    expect(result.data?.nextEventWatermark).toEqual(expect.any(String));
  });

  it('propagates query errors', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    mockEsClient.esql.query.mockRejectedValueOnce(new Error('ES error'));

    const state = createDispatcherPipelineState();
    await expect(step.execute(state)).rejects.toThrow('ES error');
  });

  describe('windowing', () => {
    const TOLERANCE_MS = 100;

    it('cold start (no eventWatermark): uses gte = now − LOOKBACK and lte capped by SETTLE_BUFFER + TICK_CAP', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);
      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const state = createDispatcherPipelineState();
      const before = Date.now();
      await step.execute(state);
      const after = Date.now();

      const range = extractTimestampRange(mockEsClient.esql.query.mock.calls[0][0]);
      expect(range).toHaveProperty('gte');
      expect(range).toHaveProperty('lte');
      expect(range).not.toHaveProperty('gt');

      const gte = new Date(range.gte as string).getTime();
      const lte = new Date(range.lte as string).getTime();
      const lookbackMs = LOOKBACK_WINDOW_MINUTES * 60_000;
      const capMs = TICK_LOOKBACK_CAP_MINUTES * 60_000;
      const settleMs = SETTLE_BUFFER_SECONDS * 1_000;

      expect(gte).toBeGreaterThanOrEqual(before - lookbackMs - TOLERANCE_MS);
      expect(gte).toBeLessThanOrEqual(after - lookbackMs + TOLERANCE_MS);
      expect(lte - gte).toBeLessThanOrEqual(capMs + TOLERANCE_MS);
      expect(lte).toBeLessThanOrEqual(after - settleMs + TOLERANCE_MS);
    });

    it('subsequent run (eventWatermark present): uses gte = watermark and caps at TICK_CAP', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);
      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const watermark = moment().subtract(30, 'seconds').toDate();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });
      await step.execute(state);

      const range = extractTimestampRange(mockEsClient.esql.query.mock.calls[0][0]);
      expect(range).toHaveProperty('gte', watermark.toISOString());
      expect(range).not.toHaveProperty('gt');
      // Window narrower than the cap because settle buffer pulls lte back.
      const gte = new Date(range.gte as string).getTime();
      const lte = new Date(range.lte as string).getTime();
      expect(lte).toBeGreaterThan(gte);
      expect(lte - gte).toBeLessThanOrEqual(TICK_LOOKBACK_CAP_MINUTES * 60_000 + TOLERANCE_MS);
    });

    it('stale watermark: window length is capped at TICK_LOOKBACK_CAP_MINUTES', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);
      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const watermark = moment().subtract(10, 'minutes').toDate();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });
      await step.execute(state);

      const range = extractTimestampRange(mockEsClient.esql.query.mock.calls[0][0]);
      const gte = new Date(range.gte as string).getTime();
      const lte = new Date(range.lte as string).getTime();
      expect(lte - gte).toBeLessThanOrEqual(TICK_LOOKBACK_CAP_MINUTES * 60_000 + TOLERANCE_MS);
    });

    it('on an empty window publishes nextEventWatermark equal to the queried lte bound', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);
      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const state = createDispatcherPipelineState();
      const result = await step.execute(state);

      expect(result.type).toBe('halt');
      if (result.type !== 'halt') return;
      const range = extractTimestampRange(mockEsClient.esql.query.mock.calls[0][0]);
      expect(result.data?.nextEventWatermark).toBe(range.lte);
    });

    it('settle buffer collapses the window: halts without advancing the watermark', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);

      // Simulate a watermark equal to "now" minus less than the settle buffer:
      // windowStart > windowEnd, so the step should halt before issuing any
      // ES query and must NOT publish nextEventWatermark.
      const watermark = moment().add(1, 'minute').toDate();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });
      const result = await step.execute(state);

      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
      expect(result).toEqual({ type: 'halt', reason: 'no_episodes' });
    });
  });
});

describe('parseDataJson', () => {
  it('parses valid JSON object', () => {
    expect(parseDataJson('{"severity":"critical","count":5}')).toEqual({
      severity: 'critical',
      count: 5,
    });
  });

  it('returns empty object for malformed JSON', () => {
    expect(parseDataJson('{not valid')).toEqual({});
  });

  it('returns empty object for JSON array', () => {
    expect(parseDataJson('[1,2,3]')).toEqual({});
  });

  it('returns empty object for JSON null', () => {
    expect(parseDataJson('null')).toEqual({});
  });

  it('filters out non-primitive values', () => {
    expect(parseDataJson('{"a":"ok","b":{"nested":true},"c":[1]}')).toEqual({ a: 'ok' });
  });

  it('keeps string, number, and boolean values', () => {
    expect(parseDataJson('{"s":"str","n":42,"b":true}')).toEqual({ s: 'str', n: 42, b: true });
  });

  it('unflattens dot-separated keys into nested objects', () => {
    expect(parseDataJson('{"host.name":"my-host.com","host.ip":"10.0.0.1"}')).toEqual({
      host: { name: 'my-host.com', ip: '10.0.0.1' },
    });
  });

  it('handles mixed flat and dot-separated keys', () => {
    expect(parseDataJson('{"severity":"critical","host.name":"srv-01"}')).toEqual({
      severity: 'critical',
      host: { name: 'srv-01' },
    });
  });

  it('handles deeply nested dot-separated keys', () => {
    expect(parseDataJson('{"a.b.c":"deep"}')).toEqual({
      a: { b: { c: 'deep' } },
    });
  });
});

describe('parseAlertEpisodes', () => {
  it('converts data_json to data and removes data_json', () => {
    const raw = [
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        episode_status: 'active' as const,
        data_json: '{"host":"server-01"}',
      },
    ];

    const result = parseAlertEpisodes(raw);

    expect(result).toHaveLength(1);
    expect(result[0].data).toEqual({ host: 'server-01' });
    expect(result[0]).not.toHaveProperty('data_json');
  });

  it('omits data when data_json is null', () => {
    const raw = [
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: 'r1',
        group_hash: 'h1',
        episode_id: 'e1',
        episode_status: 'active' as const,
        data_json: null,
      },
    ];

    const result = parseAlertEpisodes(raw);

    expect(result).toHaveLength(1);
    expect(result[0].data).toBeUndefined();
  });
});
