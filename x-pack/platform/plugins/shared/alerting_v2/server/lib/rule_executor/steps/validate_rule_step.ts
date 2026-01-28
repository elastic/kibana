/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { rule } = state;

    if (!rule) {
      throw new Error('ValidateRuleStep requires rule from previous step');
    }

    if (!rule.enabled) {
      return { type: 'halt', reason: 'rule_disabled' };
    }

    return { type: 'continue' };
  }
}
