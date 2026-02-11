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
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createDirectorService } from '../../director/director.mock';

describe('DirectorStep', () => {
  const { loggerService } = createLoggerService();

  const createEmptyEsqlResponse = () => ({
    columns: [
      { name: 'group_hash', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
    ],
    values: [],
  });

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
});
