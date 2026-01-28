/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidateRuleStep } from './validate_rule_step';
import type { RulePipelineState } from '../types';
import type { RuleResponse } from '../../rules_client';
import { createRuleExecutionInput, createRuleResponse } from '../test_utils';

describe('ValidateRuleStep', () => {
  const createState = (rule?: RuleResponse): RulePipelineState => ({
    input: createRuleExecutionInput(),
    rule,
  });

  it('continues when rule is enabled', async () => {
    const step = new ValidateRuleStep();
    const state = createState(createRuleResponse({ enabled: true }));

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('halts with rule_disabled when rule is disabled', async () => {
    const step = new ValidateRuleStep();
    const state = createState(createRuleResponse({ enabled: false }));

    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'halt',
      reason: 'rule_disabled',
    });
  });

  it('halts with state_not_ready when rule is missing from state', async () => {
    const step = new ValidateRuleStep();
    const state = createState(undefined);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
  });
});
