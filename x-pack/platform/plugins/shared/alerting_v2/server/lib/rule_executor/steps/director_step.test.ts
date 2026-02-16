/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DirectorStep } from './director_step';
import { createRulePipelineState, createAlertEvent, createRuleResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createDirectorService } from '../../director/director.mock';

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

  it('runs the director for alertable rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    mockEsClient.esql.query.mockResolvedValue(createEmptyEsqlResponse());

    const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents,
    });

    const result = await step.execute(state);

    expect(mockEsClient.esql.query).toHaveBeenCalled();
    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');
  });

  it('skips episode tracking for signal rules', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'signal' }),
      alertEvents,
    });

    const result = await step.execute(state);

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'continue',
      data: { alertEvents },
    });
  });

  it('handles empty alert events', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents: [],
    });

    const result = await step.execute(state);

    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: 'continue',
      data: { alertEvents: [] },
    });
  });

  it('propagates errors from elasticsearch', async () => {
    const { directorService, mockEsClient } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);

    const alertEvents = [createAlertEvent()];
    mockEsClient.esql.query.mockRejectedValue(new Error('ES query failed'));

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'alert' }),
      alertEvents,
    });

    await expect(step.execute(state)).rejects.toThrow('ES query failed');
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const { directorService } = createDirectorService();
    const step = new DirectorStep(loggerService, directorService);
    const state = createRulePipelineState();

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
