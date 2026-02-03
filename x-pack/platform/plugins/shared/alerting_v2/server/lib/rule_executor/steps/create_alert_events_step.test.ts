/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateAlertEventsStep } from './create_alert_events_step';
import {
  createRuleExecutionInput,
  createRuleResponse,
  createEsqlResponse,
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
    const esqlResponse = createEsqlResponse();

    const state = createRulePipelineState({ input, rule, esqlResponse });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.alertEvents');

    // @ts-expect-error: the above check ensures the alertEvents exists
    const { alertEvents } = result.data;

    expect(alertEvents).toHaveLength(2);

    expect(alertEvents[0]).toEqual({
      '@timestamp': expect.any(String),
      scheduled_timestamp: input.scheduledAt,
      rule: { id: rule.id, version: 1 },
      group_hash: expect.any(String),
      data: { 'host.name': 'host-a' },
      status: 'breached',
      source: 'internal',
      type: 'signal',
    });

    expect(alertEvents[1]).toEqual({
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

  it('halts with state_not_ready when rule is missing from state', async () => {
    const state = createRulePipelineState({ esqlResponse: createEsqlResponse() });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });

  it('halts with state_not_ready when esqlResponse is missing from state', async () => {
    const state = createRulePipelineState({ rule: createRuleResponse() });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
