/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { FetchEpisodesStep, parseDataJson, parseAlertEpisodes } from './fetch_episodes_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import {
  LOOKBACK_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_LOOKBACK_CAP_MINUTES,
} from '../constants';
import { createDispatchableAlertEventsResponse } from '../fixtures/dispatcher';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';

describe('FetchEpisodesStep', () => {
  it('returns episodes and continues when episodes are found', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    const episodes = [
      createAlertEpisode({ rule_id: 'r1', group_hash: 'h1', episode_id: 'e1' }),
      createAlertEpisode({ rule_id: 'r2', group_hash: 'h2', episode_id: 'e2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(episodes));

    const state = createDispatcherPipelineState({
      input: {
        startedAt: new Date(),
        previousStartedAt: new Date(),
        eventWatermark: moment().subtract(2, 'minutes').toDate(),
      },
    });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes).toHaveLength(2);
    expect(result.data?.episodes?.[0].rule_id).toBe('r1');
    expect(result.data?.nextEventWatermark).toEqual(expect.any(String));
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

    const state = createDispatcherPipelineState({
      input: {
        startedAt: new Date(),
        previousStartedAt: new Date(),
        eventWatermark: moment().subtract(2, 'minutes').toDate(),
      },
    });
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

    const state = createDispatcherPipelineState({
      input: {
        startedAt: new Date(),
        previousStartedAt: new Date(),
        eventWatermark: moment().subtract(2, 'minutes').toDate(),
      },
    });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes?.[0].data).toBeUndefined();
  });

  it('halts with no_episodes when none are found and still advances the watermark', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

    const state = createDispatcherPipelineState({
      input: {
        startedAt: new Date(),
        previousStartedAt: new Date(),
        eventWatermark: moment().subtract(2, 'minutes').toDate(),
      },
    });
    const result = await step.execute(state);

    expect(result.type).toBe('halt');
    if (result.type !== 'halt') return;
    expect(result.reason).toBe('no_episodes');
    expect(result.data?.nextEventWatermark).toEqual(expect.any(String));
  });

  it('propagates query errors', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    mockEsClient.esql.query.mockRejectedValueOnce(new Error('ES error'));

    const state = createDispatcherPipelineState({
      input: {
        startedAt: new Date(),
        previousStartedAt: new Date(),
        eventWatermark: moment().subtract(2, 'minutes').toDate(),
      },
    });
    await expect(step.execute(state)).rejects.toThrow('ES error');
  });

  describe('windowing', () => {
    it('cold start: queries [now − LOOKBACK_WINDOW_MINUTES, now − SETTLE_BUFFER] capped to TICK_LOOKBACK_CAP_MINUTES, with gte boundary', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);

      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const before = Date.now();
      const state = createDispatcherPipelineState({
        input: { startedAt: new Date(), previousStartedAt: new Date() },
      });
      await step.execute(state);
      const after = Date.now();

      const [callArg] = mockEsClient.esql.query.mock.calls[0];
      const range = (callArg as any).filter.range['@timestamp'];

      expect(range).toHaveProperty('gte');
      expect(range).not.toHaveProperty('gt');
      expect(range).toHaveProperty('lte');

      const gte = new Date(range.gte).getTime();
      const lte = new Date(range.lte).getTime();
      const lookbackMs = LOOKBACK_WINDOW_MINUTES * 60_000;
      const capMs = TICK_LOOKBACK_CAP_MINUTES * 60_000;
      const settleMs = SETTLE_BUFFER_SECONDS * 1_000;

      // gte ≈ now − LOOKBACK_WINDOW_MINUTES
      expect(gte).toBeGreaterThanOrEqual(before - lookbackMs - 5);
      expect(gte).toBeLessThanOrEqual(after - lookbackMs + 5);

      // lte ≈ gte + cap (because cap < lookback, the cap dominates over `now − settle`)
      expect(lte - gte).toBeLessThanOrEqual(capMs + 5);
      // and lte must be ≤ now − settle
      expect(lte).toBeLessThanOrEqual(after - settleMs + 5);
    });

    it('subsequent run: uses the watermark with strict `gt` lower bound', async () => {
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

      const [callArg] = mockEsClient.esql.query.mock.calls[0];
      const range = (callArg as any).filter.range['@timestamp'];

      expect(range).toHaveProperty('gt', watermark.toISOString());
      expect(range).not.toHaveProperty('gte');
      expect(range).toHaveProperty('lte');
    });

    it('subsequent run: caps windowEnd at windowStart + TICK_LOOKBACK_CAP_MINUTES even with a stale watermark', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);

      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const watermark = moment().subtract(1, 'hour').toDate();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });

      await step.execute(state);

      const [callArg] = mockEsClient.esql.query.mock.calls[0];
      const range = (callArg as any).filter.range['@timestamp'];

      const lte = new Date(range.lte).getTime();
      const gt = new Date(range.gt).getTime();
      const capMs = TICK_LOOKBACK_CAP_MINUTES * 60_000;

      expect(lte - gt).toBeLessThanOrEqual(capMs + 5);
      expect(lte - gt).toBeGreaterThan(0);
    });

    it('returned nextEventWatermark equals the upper bound sent to ES', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);

      mockEsClient.esql.query.mockResolvedValueOnce(
        createDispatchableAlertEventsResponse([createAlertEpisode()])
      );

      const watermark = moment().subtract(2, 'hour').toDate();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });

      const result = await step.execute(state);

      const [callArg] = mockEsClient.esql.query.mock.calls[0];
      const range = (callArg as any).filter.range['@timestamp'];

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.nextEventWatermark).toBe(range.lte);
    });

    it('settle buffer collapses an up-to-date watermark into an empty window: halts without advancing', async () => {
      // Watermark already at "now" — windowEnd = min(now + cap, now − settle) = now − settle,
      // which is BEFORE the watermark. The step must not query nor advance.
      const { queryService, mockEsClient } = createQueryService();
      const step = new FetchEpisodesStep(queryService);

      const watermark = new Date();
      const state = createDispatcherPipelineState({
        input: {
          startedAt: new Date(),
          previousStartedAt: new Date(),
          eventWatermark: watermark,
        },
      });

      const result = await step.execute(state);

      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
      expect(result.type).toBe('halt');
      if (result.type !== 'halt') return;
      expect(result.reason).toBe('no_episodes');
      expect(result.data?.nextEventWatermark).toBeUndefined();
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
