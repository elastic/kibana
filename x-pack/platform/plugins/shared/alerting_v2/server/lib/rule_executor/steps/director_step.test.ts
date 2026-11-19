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
} from '../test_utils';
import { createDirectorService } from '../../director/director.mock';
import type { DirectorRunResult, DirectorService } from '../../director/director';
import { RULE_EXECUTION_COUNTERS } from '../metrics/counters';

const createStubDirector = (result: DirectorRunResult): DirectorService =>
  ({ run: jest.fn().mockResolvedValue(result) } as unknown as DirectorService);

describe('DirectorStep', () => {
  const createEmptyEsqlResponse = () => ({
    columns: [
      { name: 'group_hash', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
      { name: 'last_episode_status_count', type: 'long' },
      { name: 'last_episode_timestamp', type: 'date' },
      { name: 'last_episode_phase_started_at', type: 'date' },
    ],
    values: [],
  });

  it('runs the director for alertable rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(directorService);

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
  });

  it('threads freshly-opened episode ids on state for alertable rules (no direct counter)', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(directorService);

    // No previous episode state, so both events open a new episode.
    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const alertEventsBatch = [
      createAlertEvent({ group_hash: 'hash-1' }),
      createAlertEvent({ group_hash: 'hash-2' }),
    ];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');

    expect(result.state.newEpisodeIds).toHaveLength(2);
  });

  it('threads the batch status transitions on state for alertable rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(directorService);

    // No previous episode state, so the event opens a new pending episode.
    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.state.alertStatusTransitions).toEqual([
      {
        groupHash: 'hash-1',
        episodeId: result.state.alertEventsBatch?.[0].alert?.id,
        previousStatus: null,
        status: 'pending',
      },
    ]);
  });

  it('emits episode transition counters grouped by destination status', async () => {
    const director = createStubDirector({
      alertEvents: [createAlertEvent({ group_hash: 'hash-1' })],
      stats: {
        newEpisodeIds: [],
        statusTransitions: [
          { groupHash: 'g1', episodeId: 'e1', previousStatus: 'inactive', status: 'active' },
          { groupHash: 'g2', episodeId: 'e2', previousStatus: null, status: 'active' },
          { groupHash: 'g3', episodeId: 'e3', previousStatus: 'active', status: 'recovering' },
          { groupHash: 'g4', episodeId: 'e4', previousStatus: 'recovering', status: 'inactive' },
        ],
      },
      previousAlertStateByGroupHash: new Map(),
    });
    const step = new DirectorStep(director);

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    // @ts-expect-error: meta is present on the result
    expect(result.meta?.counters).toEqual({
      [RULE_EXECUTION_COUNTERS.episodesTransitionedToActive]: 2,
      [RULE_EXECUTION_COUNTERS.episodesTransitionedToRecovering]: 1,
      [RULE_EXECUTION_COUNTERS.episodesTransitionedToInactive]: 1,
    });
  });

  it('counts each (episode, status) transition once across batches of the same run', async () => {
    // An ungrouped rule can surface the same episode in several batches; with
    // this run's writes not yet refreshed, the director recomputes the same
    // transition each batch. The step must report it once.
    const transition = {
      groupHash: 'g1',
      episodeId: 'e1',
      previousStatus: 'inactive' as const,
      status: 'active' as const,
    };
    const director = createStubDirector({
      alertEvents: [createAlertEvent({ group_hash: 'hash-1' })],
      stats: { newEpisodeIds: [], statusTransitions: [transition] },
      previousAlertStateByGroupHash: new Map(),
    });
    const step = new DirectorStep(director);

    const batchState = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
    });

    const [first, second] = await collectStreamResults(
      step.executeStream(createPipelineStream([batchState, batchState]))
    );

    // @ts-expect-error: meta is present on the result
    expect(first.meta?.counters).toEqual({
      [RULE_EXECUTION_COUNTERS.episodesTransitionedToActive]: 1,
    });
    // @ts-expect-error: meta is present on the result
    expect(second.meta?.counters).toEqual({});
  });

  it('does not emit a counter for transitions to pending', async () => {
    const director = createStubDirector({
      alertEvents: [createAlertEvent({ group_hash: 'hash-1' })],
      stats: {
        newEpisodeIds: [],
        statusTransitions: [
          { groupHash: 'g1', episodeId: 'e1', previousStatus: null, status: 'pending' },
        ],
      },
      previousAlertStateByGroupHash: new Map(),
    });
    const step = new DirectorStep(director);

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    // @ts-expect-error: meta is present on the result
    expect(result.meta?.counters).toEqual({});
  });

  it('skips episode tracking for signal rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(directorService);

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
    const step = new DirectorStep(directorService);

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
    const step = new DirectorStep(directorService);

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
    const step = new DirectorStep(directorService);

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
    const step = new DirectorStep(directorService);
    const state = createRulePipelineState();

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
  it('threads the prior state the director loaded onto state.previousAlertStateByGroupHash', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(directorService);

    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    expect(result.state.previousAlertStateByGroupHash).toEqual(new Map());
  });
});
