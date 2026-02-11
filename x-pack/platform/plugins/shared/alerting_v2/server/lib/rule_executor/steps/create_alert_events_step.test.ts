/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAlertEventsStep } from './create_alert_events_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
  createRulePipelineState,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('CreateAlertEventsStep', () => {
  let step: CreateAlertEventsStep;

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    step = new CreateAlertEventsStep(loggerService);
  });

  it('builds alert events correctly', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();
    const esqlRowBatch = [{ 'host.name': 'host-a' }, { 'host.name': 'host-b' }];

    const state = createRulePipelineState({ input, rule, esqlRowBatch });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    expect(result.state.alertEventsBatch).toHaveLength(2);

    expect(result.state.alertEventsBatch?.[0]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-a' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
    });

    expect(result.state.alertEventsBatch?.[1]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-b' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
    });
  });

  it('yields multiple batches when receiving multiple input batches', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();
    const batch1 = [{ 'host.name': 'host-a' }];
    const batch2 = [{ 'host.name': 'host-b' }];

    const state1 = createRulePipelineState({ input, rule, esqlRowBatch: batch1 });
    const state2 = createRulePipelineState({ input, rule, esqlRowBatch: batch2 });

    const results = await collectStreamResults(
      step.executeStream(createPipelineStream([state1, state2]))
    );

    expect(results).toHaveLength(2);
    expect(results[0].type).toBe('continue');
    expect(results[0].state.alertEventsBatch).toHaveLength(1);
    expect(results[1].type).toBe('continue');
    expect(results[1].state.alertEventsBatch).toHaveLength(1);
  });

  it('skips batches that produce no alert events', async () => {
    const input = createRuleExecutionInput();
    const rule = createRuleResponse();

    const state = createRulePipelineState({ input, rule, esqlRowBatch: [] });

    const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(results).toHaveLength(0);
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState({ esqlRowBatch: [{ 'host.name': 'host-a' }] });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('halts with state_not_ready when esqlRowBatch is missing from state', async () => {
    const state = createRulePipelineState({ rule: createRuleResponse() });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
