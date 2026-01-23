/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuildQueryStep } from './build_query_step';
import type { RulePipelineState } from '../types';
import { createLoggerService, createRuleExecutionInput, createRuleResponse } from '../../test_utils';

describe('BuildQueryStep', () => {
  const createState = (
    rule?: ReturnType<typeof createRuleResponse>
  ): RulePipelineState => ({
    input: createRuleExecutionInput(),
    rule,
  });

  it('builds query payload and continues with data', async () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const rule = createRuleResponse();
    const state = createState(rule);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.queryPayload');

    if (result.type !== 'continue') throw new Error('Expected continue');
    const { queryPayload } = result.data as { queryPayload: unknown };
    expect(queryPayload).toHaveProperty('filter');
    expect(queryPayload).toHaveProperty('dateStart');
    expect(queryPayload).toHaveProperty('dateEnd');
  });

  it('uses rule query, timeField, and lookbackWindow', async () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const rule = createRuleResponse({
      query: 'FROM metrics-* | WHERE host.name == "server-1"',
      timeField: 'event.timestamp',
      lookbackWindow: '15m',
    });
    const state = createState(rule);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.queryPayload');
  });

  it('throws when rule is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const state = createState(undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'BuildQueryStep requires rule from previous step'
    );
  });

  it('logs debug message with query details', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const rule = createRuleResponse();
    const state = createState(rule);

    await step.execute(state);

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('has correct step name', () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);

    expect(step.name).toBe('build_query');
  });
});
