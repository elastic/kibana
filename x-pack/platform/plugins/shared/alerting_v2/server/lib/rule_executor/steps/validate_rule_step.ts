/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapOneToOneStep, requireState } from '../stream_utils';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return mapOneToOneStep(streamState, (state) => {
      const { input } = state;

      this.logger.debug({
        message: `[${this.name}] Starting step for rule ${input.ruleId}`,
      });

      const requiredState = requireState(state, ['rule']);

      if (!requiredState.ok) {
        this.logger.debug({ message: `[${this.name}] State not ready, halting` });
        return requiredState.result;
      }

      if (!requiredState.state.rule.enabled) {
        this.logger.debug({
          message: `[${this.name}] Rule ${input.ruleId} is disabled, halting`,
        });

        return { type: 'halt', reason: 'rule_disabled', state };
      }

      this.logger.debug({
        message: `[${this.name}] Rule ${input.ruleId} is valid and enabled`,
      });

      return { type: 'continue', state: requiredState.state };
    });
  }
}
