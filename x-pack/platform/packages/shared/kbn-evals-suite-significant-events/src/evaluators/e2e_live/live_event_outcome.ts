/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { E2ELiveEvaluationExample, E2ELiveEvaluator, E2ELivePipelineOutput } from './types';

export interface LiveEventOutcomeResult {
  passed: boolean;
  openEvents: SignificantEvent[];
  detail: string;
}

/**
 * Shared final-event check without any rule-uuid mapping (there is no canonical catalog in live
 * mode): an incident scenario passes when at least one event ends the run open; a baseline
 * scenario passes when zero events end open (dismissed/closed are fine).
 */
export const computeLiveEventOutcome = (
  output: E2ELivePipelineOutput | undefined,
  expected: E2ELiveEvaluationExample['output'] | undefined
): LiveEventOutcomeResult => {
  const events = output?.significantEvents ?? [];
  const openEvents = events.filter((event) => event.status === 'open');

  if (expected?.expect_no_open_events) {
    return {
      passed: openEvents.length === 0,
      openEvents,
      detail:
        openEvents.length === 0
          ? 'no open events, as required for the healthy baseline'
          : `open event(s) raised on healthy traffic: ${openEvents
              .map((event) => event.event_id)
              .join(', ')}`,
    };
  }

  if (expected?.expect_open_event) {
    return {
      passed: openEvents.length > 0,
      openEvents,
      detail:
        openEvents.length > 0
          ? `open event(s): ${openEvents
              .map((event) => `${event.event_id} (${event.severity})`)
              .join(', ')}`
          : `no open event raised — final statuses: ${
              events.map((event) => `${event.event_id}=${event.status}`).join(', ') || 'none'
            }`,
    };
  }

  return { passed: true, openEvents, detail: 'no event expectation declared' };
};

/** CODE evaluator: binary final-outcome check on the events index. */
export const liveEventOutcomeEvaluator: E2ELiveEvaluator = {
  name: 'live_event_outcome',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const result = computeLiveEventOutcome(output, expected);
    return Promise.resolve({
      score: result.passed ? 1 : 0,
      explanation: `Live event outcome ${result.passed ? 'pass' : 'FAIL'} — ${result.detail}`,
    });
  },
};
