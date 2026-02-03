/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import type { StateWithRule } from '../type_guards';
import { hasRule } from '../type_guards';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  private isStepReady(state: Readonly<RulePipelineState>): state is StateWithRule {
    return hasRule(state);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    if (!this.isStepReady(state)) {
      return { type: 'halt', reason: 'state_not_ready' };
    }

    if (!state.rule.enabled) {
      return { type: 'halt', reason: 'rule_disabled' };
    }

    return { type: 'continue' };
  }
}
