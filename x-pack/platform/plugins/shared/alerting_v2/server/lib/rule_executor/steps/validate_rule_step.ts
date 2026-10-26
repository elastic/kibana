/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { guardedMapStep } from '../stream_utils';

@injectable()
export class ValidateRuleStep implements RuleExecutionStep {
  public readonly name = 'validate_rule';

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['rule'], (state) => {
      if (!state.rule.enabled) {
        state.logger.withLabels({ step: this.name }).debug({
          message: 'Rule is disabled, halting',
        });

        return { type: 'halt', reason: 'rule_disabled', state };
      }

      return { type: 'continue', state };
    });
  }
}
