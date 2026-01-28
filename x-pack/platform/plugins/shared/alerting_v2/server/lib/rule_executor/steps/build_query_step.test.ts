/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuildQueryStep } from './build_query_step';
import type { RulePipelineState } from '../types';
import { createRuleExecutionInput, createRuleResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('BuildQueryStep', () => {
  const createState = (rule?: ReturnType<typeof createRuleResponse>): RulePipelineState => ({
    input: createRuleExecutionInput(),
    rule,
  });

  it('builds query payload correctly', async () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const rule = createRuleResponse();

    const state = createState(rule);

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.queryPayload');

    // @ts-expect-error: the above check ensures the queryPayload exists
    const { queryPayload } = result.data;
    expect(queryPayload).toHaveProperty('filter');
    expect(queryPayload).toHaveProperty('dateStart');
    expect(queryPayload).toHaveProperty('dateEnd');
  });

  it('throws when rule is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const step = new BuildQueryStep(loggerService);
    const state = createState(undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'BuildQueryStep requires rule from previous step'
    );
  });
});
