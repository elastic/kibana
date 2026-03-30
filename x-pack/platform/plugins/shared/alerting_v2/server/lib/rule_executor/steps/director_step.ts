/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { DirectorService } from '../../director/director';
import { guardedExpandStep } from '../stream_utils';

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(DirectorService) private readonly director: DirectorService
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule', 'alertEventsBatch'], async function* (state) {
      const { input, rule, alertEventsBatch } = state;

      if (rule.kind !== 'alert') {
        step.logger.debug({
          message: `[${step.name}] Skipping episode tracking for signal rule ${input.ruleId}`,
        });

        yield { type: 'continue', state };
        return;
      }

      if (alertEventsBatch.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No alert events to process for rule ${input.ruleId}`,
        });

        yield { type: 'continue', state };
        return;
      }

      const processedBatch = await step.director.run({
        rule,
        executionContext: input.executionContext,
        alertEvents: alertEventsBatch,
      });

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch: processedBatch },
      };
    });
  }
}
