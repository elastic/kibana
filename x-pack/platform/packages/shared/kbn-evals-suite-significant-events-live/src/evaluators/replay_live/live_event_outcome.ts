/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, SignificantEvent } from '@kbn/significant-events-schema';
import type { ReplayLiveExample, ReplayLiveEvaluator, ReplayLiveOutput } from './types';

export interface LiveEventOutcomeResult {
  passed: boolean;
  openEvents: SignificantEvent[];
  detail: string;
}

const signalRuleUuids = (signals: Discovery['signals'] | SignificantEvent['signals']): string[] =>
  (signals ?? [])
    .map((signal) => signal.metadata?.rule_uuid)
    .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid));

/**
 * Resolve the rules an open event traces back to: prefer the discovery with the same event_id
 * (events_write echoes it), fall back to the event's own signals when the judge carried them.
 */
const ruleUuidsForEvent = (event: SignificantEvent, discoveries: Discovery[]): string[] => {
  const discovery = discoveries.find((candidate) => candidate.event_id === event.event_id);
  const fromDiscovery = discovery ? signalRuleUuids(discovery.signals) : [];
  return fromDiscovery.length > 0 ? fromDiscovery : signalRuleUuids(event.signals);
};

/**
 * Shared final-event check. There is no canonical rule catalog in live mode, but "any open event
 * passes" would be too generous: an open event about benign volume with zero connection to what
 * actually fired would score green. An open event only counts for the incident scenario when it
 * traces back (via its discovery's signals) to at least one detection the pipeline produced —
 * i.e. the promotion is grounded in the detection chain, not free-floating.
 */
export const computeLiveEventOutcome = (
  output: ReplayLiveOutput | undefined,
  expected: ReplayLiveExample['output'] | undefined
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
    const discoveries = output?.discoveries ?? [];
    const detectionRules = new Set((output?.detections ?? []).map((d) => d.rule_uuid));
    const groundedOpenEvents = openEvents.filter((event) =>
      ruleUuidsForEvent(event, discoveries).some((ruleUuid) => detectionRules.has(ruleUuid))
    );
    const ungroundedOpenEvents = openEvents.filter((event) => !groundedOpenEvents.includes(event));

    return {
      passed: groundedOpenEvents.length > 0,
      openEvents,
      detail:
        groundedOpenEvents.length > 0
          ? `detection-grounded open event(s): ${groundedOpenEvents
              .map((event) => `${event.event_id} (${event.severity})`)
              .join(', ')}${
              ungroundedOpenEvents.length > 0
                ? `; ${ungroundedOpenEvents.length} open event(s) with no link to produced detections ignored`
                : ''
            }`
          : openEvents.length > 0
          ? `open event(s) exist but none trace back to a produced detection: ${openEvents
              .map((event) => event.event_id)
              .join(', ')}`
          : `no open event raised — final statuses: ${
              events.map((event) => `${event.event_id}=${event.status}`).join(', ') || 'none'
            }`,
    };
  }

  return { passed: true, openEvents, detail: 'no event expectation declared' };
};

/** CODE evaluator: binary final-outcome check on the events index. */
export const liveEventOutcomeEvaluator: ReplayLiveEvaluator = {
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
