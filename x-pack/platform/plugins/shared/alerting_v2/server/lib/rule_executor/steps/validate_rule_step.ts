/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['rule'], (state) => {
      if (!state.rule.enabled) {
        this.logger.debug({
          message: `[${this.name}] Rule ${state.input.ruleId} is disabled, halting`,
        });

        return { type: 'halt', reason: 'rule_disabled', state };
      }

      return { type: 'continue', state };
    });
  }
}
