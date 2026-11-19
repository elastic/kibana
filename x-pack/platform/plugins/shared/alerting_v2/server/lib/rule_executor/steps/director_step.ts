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

/**
 * Counts episode transitions by destination status, skipping any
 * `(episodeId, status)` already counted this run.
 *
 * The director runs once per streamed query batch and this run's own writes
 * are not refreshed between batches, so an ungrouped rule whose rows span
 * several batches recomputes the same transition each time. `seen` dedupes
 * those recomputations so one episode's transition is reported once per run.
 */
const countNewTransitions = (
  transitions: readonly AlertStatusTransition[],
  seen: Set<string>
): Partial<Record<RuleExecutionCounter, number>> => {
  const counters: Partial<Record<RuleExecutionCounter, number>> = {};
  for (const { episodeId, status } of transitions) {
    const counter = TRANSITION_COUNTER[status];
    if (!counter) {
      continue;
    }
    const key = `${episodeId}:${status}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    counters[counter] = (counters[counter] ?? 0) + 1;
  }
  return counters;
};

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director';

  constructor(@inject(DirectorService) private readonly director: DirectorService) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;
    const countedTransitions = new Set<string>();

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
        meta: { counters: countNewTransitions(stats.statusTransitions, countedTransitions) },
      };
    });
  }
}
