/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DirectorStep } from './director_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createDirectorService } from '../../director/director.mock';
import type { LatestAlertEventState } from '../../director/queries';

describe('DirectorStep', () => {
  const { loggerService } = createLoggerService();

  const createEmptyEsqlResponse = () => ({
    columns: [
      { name: 'group_hash', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
      { name: 'last_episode_status_count', type: 'long' },
      { name: 'last_episode_timestamp', type: 'date' },
    ],
    values: [],
  });

  const createLatestAlertEventStateResponse = (records: LatestAlertEventState[]) =>
    createEsqlResponse(
      [
        { name: 'last_status', type: 'keyword' },
        { name: 'last_episode_id', type: 'keyword' },
        { name: 'last_episode_status', type: 'keyword' },
        { name: 'last_episode_status_count', type: 'long' },
        { name: 'last_episode_timestamp', type: 'date' },
        { name: 'group_hash', type: 'keyword' },
      ],
      records.map((r) => [
        r.last_status,
        r.last_episode_id,
        r.last_episode_status,
        r.last_episode_status_count,
        r.last_episode_timestamp ?? null,
        r.group_hash,
      ])
    );

  it('runs the director for alertable rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const alertEventsBatch = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalled();
    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toBeDefined();
    expect(result.state.alertEventsBatch).toHaveLength(1);
    expect(result.state.alertEventsBatch![0]).not.toHaveProperty('transitioned');
    expect(result.state.alertEventsBatch![0]).toHaveProperty('episode');
  });

  it('skips episode tracking for signal rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const alertEventsBatch = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'signal' }),
      alertEventsBatch,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'continue',
      state,
    });
  });

  it('handles empty alert events', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'continue',
      state,
    });
  });

  it('propagates errors from elasticsearch', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const alertEventsBatch = [createAlertEvent()];
    mockEsClient.esql.query.mockRejectedValue(new Error('ES query failed'));

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch,
    });

    await expect(
      collectStreamResults(step.executeStream(createPipelineStream([state])))
    ).rejects.toThrow('ES query failed');
  });

  it('passes executionContext signal to ES client for state lookups', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });
    const state = createRulePipelineState({
      input,
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent()],
    });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { directorService } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);
    const state = createRulePipelineState();

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('only counts real transitions in episode metrics', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    mockEsClient.esql.query.mockResolvedValue(
      createLatestAlertEventStateResponse([
        {
          last_episode_timestamp: '2026-01-01T00:00:00.000Z',
          last_status: 'breached',
          last_episode_id: 'episode-1',
          last_episode_status: 'active',
          last_episode_status_count: null,
          group_hash: 'hash-1',
        },
        {
          last_episode_timestamp: '2026-01-01T00:00:00.000Z',
          last_status: 'breached',
          last_episode_id: 'episode-2',
          last_episode_status: 'active',
          last_episode_status_count: null,
          group_hash: 'hash-2',
        },
      ])
    );

    const alertEventsBatch = [
      createAlertEvent({ group_hash: 'hash-1', status: 'breached' }),
      createAlertEvent({ group_hash: 'hash-2', status: 'recovered' }),
    ];

    const input = createRuleExecutionInput();
    const state = createRulePipelineState({
      input,
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual(
      expect.objectContaining({
        type: 'continue',
        annotations: {
          episodesTransitioned: {
            active: 0,
            recovering: 1,
            inactive: 0,
          },
        },
      })
    );
  });
});
