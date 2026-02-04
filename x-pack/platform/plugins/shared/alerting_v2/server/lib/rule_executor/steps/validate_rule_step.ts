/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { hasState, type StateWith } from '../type_guards';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  private isStepReady(state: Readonly<RulePipelineState>): state is StateWith<'rule'> {
    return hasState(state, ['rule']);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId}`,
    });

    if (!this.isStepReady(state)) {
      this.logger.debug({ message: `[${this.name}] State not ready, halting` });
      return { type: 'halt', reason: 'state_not_ready' };
    }

    if (!state.rule.enabled) {
      this.logger.debug({ message: `[${this.name}] Rule ${input.ruleId} is disabled, halting` });
      return { type: 'halt', reason: 'rule_disabled' };
    }

    this.logger.debug({
      message: `[${this.name}] Rule ${input.ruleId} is valid and enabled`,
    });

    return { type: 'continue' };
  }
}
