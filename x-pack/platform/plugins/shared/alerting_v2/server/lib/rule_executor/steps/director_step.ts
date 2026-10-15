/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { DirectorService } from '../../director/director';
import { guardedExpandStep } from '../stream_utils';

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director';

  constructor(@inject(DirectorService) private readonly director: DirectorService) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule', 'alertEventsBatch'], async function* (state) {
      const { input, rule, alertEventsBatch } = state;
      const logger = state.logger.withLabels({ step: step.name });

      if (rule.kind !== 'alert') {
        logger.debug({ message: 'Skipping episode tracking for signal rule' });

        yield { type: 'continue', state };
        return;
      }

      if (alertEventsBatch.length === 0) {
        logger.debug({ message: 'No alert events to process' });

        yield { type: 'continue', state };
        return;
      }

      const { alertEvents, stats } = await step.director.run({
        rule,
        executionContext: input.executionContext,
        alertEvents: alertEventsBatch,
        spaceId: input.spaceId,
      });

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch: alertEvents, newEpisodeIds: stats.newEpisodeIds },
      };
    });
  }
}
