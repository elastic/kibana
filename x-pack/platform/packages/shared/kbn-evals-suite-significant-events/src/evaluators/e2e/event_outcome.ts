/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, SignificantEvent } from '@kbn/significant-events-schema';
import type { E2EExpectedEvent } from '../../datasets/types';
import type { E2EEvaluator, E2EPipelineOutput } from './types';

const signalRuleUuids = (signals: Discovery['signals'] | SignificantEvent['signals']): string[] =>
  (signals ?? [])
    .map((signal) => signal.metadata?.rule_uuid)
    .filter((ruleUuid): ruleUuid is string => Boolean(ruleUuid));

/**
 * Resolve the rule_uuids underlying an event: prefer the produced discovery with the same
 * event_id (events_write echoes the discovery's event_id), fall back to the event's own signals
 * when the judge carried them through.
 */
const ruleUuidsForEvent = (event: SignificantEvent, discoveries: Discovery[]): string[] => {
  const discovery = discoveries.find((candidate) => candidate.event_id === event.event_id);
  const fromDiscovery = discovery ? signalRuleUuids(discovery.signals) : [];
  return fromDiscovery.length > 0 ? fromDiscovery : signalRuleUuids(event.signals);
};

const intersects = (a: string[], b: string[]): boolean => a.some((value) => b.includes(value));

export interface EventOutcomeResult {
  satisfiedEntries: E2EExpectedEvent[];
  unsatisfiedEntries: E2EExpectedEvent[];
  /** Open events not justified by any expected entry that allows an open status. */
  unjustifiedOpenEvents: SignificantEvent[];
  recall: number;
  precision: number;
  score: number;
}

/**
 * Shared outcome computation for the event checkpoint — also consumed by the funnel-completion
 * evaluator so both score the same definition of "the right events were raised".
 */
export const computeEventOutcome = (
  output: E2EPipelineOutput | undefined,
  expected:
    | {
        expected_events?: E2EExpectedEvent[];
        expect_no_open_events?: boolean;
      }
    | undefined
): EventOutcomeResult => {
  const expectedEvents = expected?.expected_events ?? [];
  const events = output?.significantEvents ?? [];
  const discoveries = output?.discoveries ?? [];

  const satisfiedEntries: E2EExpectedEvent[] = [];
  const unsatisfiedEntries: E2EExpectedEvent[] = [];
  for (const entry of expectedEvents) {
    const matched = events.some(
      (event) =>
        intersects(ruleUuidsForEvent(event, discoveries), entry.rule_uuids) &&
        entry.statuses.includes(event.status)
    );
    (matched ? satisfiedEntries : unsatisfiedEntries).push(entry);
  }

  const openJustifications = expectedEvents.filter((entry) => entry.statuses.includes('open'));
  const openEvents = events.filter((event) => event.status === 'open');
  const unjustifiedOpenEvents = openEvents.filter((event) => {
    if (expected?.expect_no_open_events) {
      return true;
    }
    const eventRules = ruleUuidsForEvent(event, discoveries);
    return !openJustifications.some((entry) => intersects(eventRules, entry.rule_uuids));
  });

  const recall = expectedEvents.length === 0 ? 1 : satisfiedEntries.length / expectedEvents.length;
  const precision =
    openEvents.length === 0
      ? 1
      : (openEvents.length - unjustifiedOpenEvents.length) / openEvents.length;
  const score = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { satisfiedEntries, unsatisfiedEntries, unjustifiedOpenEvents, recall, precision, score };
};

/**
 * CODE evaluator for the final checkpoint: were the right significant events raised?
 *
 * - Recall: every expected event entry is matched by an event whose underlying discovery shares
 *   at least one of the entry's rule_uuids AND whose final status is acceptable.
 * - Precision: every event ending the run `open` is justified by an expected-open entry; with
 *   `expect_no_open_events` any open event is a violation (false-positive check for baselines).
 */
export const eventOutcomeEvaluator: E2EEvaluator = {
  name: 'event_outcome',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const result = computeEventOutcome(output, expected);
    const events = output?.significantEvents ?? [];

    const details = [
      `recall ${result.recall.toFixed(2)} (${result.satisfiedEntries.length}/${
        result.satisfiedEntries.length + result.unsatisfiedEntries.length
      } expected event(s) matched)`,
      `precision ${result.precision.toFixed(2)} (${
        result.unjustifiedOpenEvents.length
      } unjustified open event(s))`,
      `events in index: ${
        events.map((event) => `${event.event_id}=${event.status}`).join(', ') || 'none'
      }`,
      ...result.unsatisfiedEntries.map(
        (entry) =>
          `unsatisfied: [${entry.rule_uuids.join(', ')}] expected status ${entry.statuses.join(
            '|'
          )}`
      ),
      ...result.unjustifiedOpenEvents.map((event) => `unjustified open: ${event.event_id}`),
    ];

    return Promise.resolve({
      score: result.score,
      explanation: `Event outcome F1 ${result.score.toFixed(2)} — ${details.join('; ')}`,
    });
  },
};
