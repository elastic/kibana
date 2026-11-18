/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { DirectorService, type AlertStatusTransition } from '../../director/director';
import { guardedExpandStep } from '../stream_utils';
import { RULE_EXECUTION_COUNTERS, type RuleExecutionCounter } from '../metrics/counters';
import {
  alertEpisodeStatus,
  type AlertEpisodeStatus,
} from '../../../resources/datastreams/alert_events';

const TRANSITION_COUNTER: Partial<Record<AlertEpisodeStatus, RuleExecutionCounter>> = {
  [alertEpisodeStatus.active]: RULE_EXECUTION_COUNTERS.episodesTransitionedToActive,
  [alertEpisodeStatus.recovering]: RULE_EXECUTION_COUNTERS.episodesTransitionedToRecovering,
  [alertEpisodeStatus.inactive]: RULE_EXECUTION_COUNTERS.episodesTransitionedToInactive,
};

/** Counts the batch's episode transitions by destination status. */
const countTransitions = (
  transitions: readonly AlertStatusTransition[]
): Partial<Record<RuleExecutionCounter, number>> => {
  const counters: Partial<Record<RuleExecutionCounter, number>> = {};
  for (const { status } of transitions) {
    const counter = TRANSITION_COUNTER[status];
    if (counter) {
      counters[counter] = (counters[counter] ?? 0) + 1;
    }
  }
  return counters;
};

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

      const { alertEvents, stats, previousAlertStateByGroupHash } = await step.director.run({
        rule,
        executionContext: input.executionContext,
        alertEvents: alertEventsBatch,
        spaceId: input.spaceId,
      });

      yield {
        type: 'continue',
        state: {
          ...state,
          alertEventsBatch: alertEvents,
          newEpisodeIds: stats.newEpisodeIds,
          alertStatusTransitions: stats.statusTransitions,
          previousAlertStateByGroupHash,
        },
        meta: { counters: countTransitions(stats.statusTransitions) },
      };
    });
  }
}
