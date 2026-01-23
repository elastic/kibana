/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidateRuleStep } from './validate_rule_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import type { RuleResponse } from '../../rules_client';

describe('ValidateRuleStep', () => {
  const createInput = (): RuleExecutionInput => ({
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
  });

  const createRule = (overrides: Partial<RuleResponse> = {}): RuleResponse => ({
    id: 'rule-1',
    name: 'test-rule',
    tags: [],
    schedule: { custom: '1m' },
    enabled: true,
    query: 'FROM logs-* | LIMIT 1',
    timeField: '@timestamp',
    lookbackWindow: '1m',
    groupingKey: [],
    createdBy: 'elastic',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createState = (rule?: RuleResponse): RulePipelineState => ({
    input: createInput(),
    rule,
  });

  it('continues when rule is enabled', async () => {
    const step = new ValidateRuleStep();
    const state = createState(createRule({ enabled: true }));

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
  });

  it('halts with rule_disabled when rule is disabled', async () => {
    const step = new ValidateRuleStep();
    const state = createState(createRule({ enabled: false }));

    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'halt',
      reason: 'rule_disabled',
    });
  });

  it('throws when rule is missing from state', async () => {
    const step = new ValidateRuleStep();
    const state = createState(undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'ValidateRuleStep requires rule from previous step'
    );
  });

  it('has correct step name', () => {
    const step = new ValidateRuleStep();
    expect(step.name).toBe('validate_rule');
  });
});
