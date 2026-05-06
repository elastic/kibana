/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchEpisodesStep, parseDataJson, parseAlertEpisodes } from './fetch_episodes_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
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

    const state = createDispatcherPipelineState();
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.episodes).toHaveLength(2);
    expect(result.data?.episodes?.[0].rule_id).toBe('r1');
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

    expect(result).toEqual({ type: 'halt', reason: 'no_episodes' });
  });

  it('propagates query errors', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchEpisodesStep(queryService);

    mockEsClient.esql.query.mockRejectedValueOnce(new Error('ES error'));

    const state = createDispatcherPipelineState();
    await expect(step.execute(state)).rejects.toThrow('ES error');
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
