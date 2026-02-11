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
import { flatMapStep, requireState } from '../stream_utils';

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(DirectorService) private readonly director: DirectorService
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return flatMapStep(streamState, async function* (state) {
      const { input } = state;

      step.logger.debug({
        message: `[${step.name}] Starting step for rule ${input.ruleId}`,
      });

      const requiredState = requireState(state, ['rule', 'alertEventsBatch']);

      if (!requiredState.ok) {
        step.logger.debug({ message: `[${step.name}] State not ready, halting` });
        yield requiredState.result;
        return;
      }

      const { rule, alertEventsBatch } = requiredState.state;

      /**
       * Only alertable rules can generate episodes.
       */
      if (rule.kind !== 'alert') {
        step.logger.debug({
          message: `[${step.name}] Skipping episode tracking for signal rule ${input.ruleId}`,
        });

        yield { type: 'continue', state: requiredState.state };
        return;
      }

      if (alertEventsBatch.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No alert events to process for rule ${input.ruleId}`,
        });

        yield { type: 'continue', state: requiredState.state };
        return;
      }

      const alertsWithEpisodesStream = step.director.run({
        ruleId: input.ruleId,
        executionContext: input.executionContext,
        alertEvents: (async function* () {
          yield [...alertEventsBatch];
        })(),
      });

      step.logger.debug({
        message: `[${step.name}] Director stream created for rule ${input.ruleId}`,
      });

      for await (const batch of alertsWithEpisodesStream) {
        if (batch.length > 0) {
          yield { type: 'continue', state: { ...requiredState.state, alertEventsBatch: batch } };
        }
      }
    });
  }
}
