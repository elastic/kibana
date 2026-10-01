/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HydrateEpisodeDataStep } from './hydrate_episode_data_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';
import { createEpisodeDataResponse } from '../fixtures/dispatcher';

describe('HydrateEpisodeDataStep', () => {
  it('returns continue without querying when dispatchable is empty', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns continue without querying when dispatchable is absent', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('attaches data to the matching episode', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [createAlertEpisode({ episode_id: 'ep-1', rule_id: 'r1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([
        { episode_id: 'ep-1', data_json: '{"host":"server-01","count":3}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({ host: 'server-01', count: 3 });
  });

  it('un-flattens dot-separated keys in data_json', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [createAlertEpisode({ episode_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([
        { episode_id: 'ep-1', data_json: '{"host.name":"srv-01","host.ip":"10.0.0.1"}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({
      host: { name: 'srv-01', ip: '10.0.0.1' },
    });
  });

  it('attaches an empty object for data_json "{}"', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [createAlertEpisode({ episode_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([{ episode_id: 'ep-1', data_json: '{}' }])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({});
  });

  it('leaves data undefined when the hydration query returns no row for an episode', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService, mockLogger } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [createAlertEpisode({ episode_id: 'ep-missing' })];

    mockEsClient.esql.query.mockResolvedValueOnce(createEpisodeDataResponse([]));

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('leaves data undefined when data_json is null', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [createAlertEpisode({ episode_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([{ episode_id: 'ep-1', data_json: null }])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toBeUndefined();
  });

  it('derives range bounds from min/max last_event_timestamp across all episodes', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [
      createAlertEpisode({
        episode_id: 'ep-1',
        last_event_timestamp: '2026-01-22T07:05:00.000Z',
      }),
      createAlertEpisode({
        episode_id: 'ep-2',
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
      }),
      createAlertEpisode({
        episode_id: 'ep-3',
        last_event_timestamp: '2026-01-22T07:01:00.000Z',
      }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([
        { episode_id: 'ep-1', data_json: '{"a":1}' },
        { episode_id: 'ep-2', data_json: '{"b":2}' },
        { episode_id: 'ep-3', data_json: '{"c":3}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    await step.execute(state, loggerService);

    const calledQuery: string = mockEsClient.esql.query.mock.calls[0][0].query;
    expect(calledQuery).toContain('"2026-01-22T07:01:00.000Z"');
    expect(calledQuery).toContain('"2026-01-22T07:10:00.000Z"');
  });

  it('attaches data to each episode independently', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    const episodes = [
      createAlertEpisode({ episode_id: 'ep-1', rule_id: 'r1' }),
      createAlertEpisode({ episode_id: 'ep-2', rule_id: 'r2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createEpisodeDataResponse([
        { episode_id: 'ep-1', data_json: '{"x":1}' },
        { episode_id: 'ep-2', data_json: '{"y":2}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({ x: 1 });
    expect(result.data?.triage?.dispatchable[1].data).toEqual({ y: 2 });
  });

  it('concatenates results from multiple chunks', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateEpisodeDataStep(queryService);

    // Two episodes that each end up in different chunks via oversized IDs
    const longId1 = 'a'.repeat(400_000) + '-1';
    const longId2 = 'b'.repeat(400_000) + '-2';
    const episodes = [
      createAlertEpisode({ episode_id: longId1, last_event_timestamp: '2026-01-22T07:00:00.000Z' }),
      createAlertEpisode({ episode_id: longId2, last_event_timestamp: '2026-01-22T07:01:00.000Z' }),
    ];

    mockEsClient.esql.query
      .mockResolvedValueOnce(
        createEpisodeDataResponse([{ episode_id: longId1, data_json: '{"c":1}' }])
      )
      .mockResolvedValueOnce(
        createEpisodeDataResponse([{ episode_id: longId2, data_json: '{"d":2}' }])
      );

    const state = createDispatcherPipelineState({ dispatchable: episodes });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const ep1 = result.data?.triage?.dispatchable.find((e) => e.episode_id === longId1);
    const ep2 = result.data?.triage?.dispatchable.find((e) => e.episode_id === longId2);
    expect(ep1?.data).toEqual({ c: 1 });
    expect(ep2?.data).toEqual({ d: 2 });
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });
});
