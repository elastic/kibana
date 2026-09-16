/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import {
  scoreTopologyCorrectness,
  scoreContinuationTopologyStability,
  topologyCorrectnessEvaluator,
  type ContinuationTopologyCycle,
} from './topology_correctness';

// --- Fixtures ---

const signal = (ruleUuid: string): SignalEntry => ({
  type: 'detection',
  stream_name: 'logs',
  verdict: 'confirms',
  description: 'test signal',
  metadata: {
    rule_uuid: ruleUuid,
    detection_id: `${ruleUuid}-det`,
    change_point_type: 'spike',
    p_value: 0.01,
  },
});

const feature = (feature_id: string) => ({
  feature_id,
  type: 'entity',
  subtype: 'service',
  name: feature_id,
  stream_name: 'logs',
});

const event = (
  eventId: string,
  ruleUuids: string[],
  causal: string[] = [],
  blast: string[] = []
): Partial<SignificantEvent> => ({
  event_id: eventId,
  status: 'open',
  signals: ruleUuids.map(signal),
  causal_features: causal.map(feature),
  blast_radius: blast.map((id) => ({
    type: 'dependency' as const,
    subtype: 'http',
    feature_id: id,
    source: 'a',
    target: 'b',
    protocol: 'http' as const,
    stream_name: 'logs',
  })),
});

// --- scoreTopologyCorrectness ---

describe('scoreTopologyCorrectness', () => {
  it('returns null (unavailable) when no expected event has topology fields', () => {
    const actual = [event('e1', ['uuid-1'], [], [])] as unknown as SignificantEvent[];
    const expected = [
      { event_id: 'e1', signals: [signal('uuid-1')], causal_features: [], blast_radius: [] },
    ];

    const result = scoreTopologyCorrectness(actual, expected);
    expect(result.score).toBeNull();
    expect(result.explanation).toMatch(/no topology/i);
  });

  it('scores a perfect match as 1.0', () => {
    const actual = [event('e1', ['uuid-1'], ['svc-a'], ['dep-1'])] as unknown as SignificantEvent[];
    const expected = [event('e1', ['uuid-1'], ['svc-a'], ['dep-1'])];

    const result = scoreTopologyCorrectness(actual, expected);
    expect(result.score).toBe(1);
  });

  it('scores a partial causal_features match below 1.0', () => {
    // expected: ['svc-a', 'svc-b'], actual: ['svc-a'] — recall=0.5, precision=1.0
    const actual = [event('e1', ['uuid-1'], ['svc-a'], [])] as unknown as SignificantEvent[];
    const expected = [event('e1', ['uuid-1'], ['svc-a', 'svc-b'], [])];

    const result = scoreTopologyCorrectness(actual, expected);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toMatch(/causal_features/);
  });

  it('scores a partial blast_radius match below 1.0', () => {
    const actual = [event('e1', ['uuid-1'], [], ['dep-1'])] as unknown as SignificantEvent[];
    const expected = [event('e1', ['uuid-1'], [], ['dep-1', 'dep-2'])];

    const result = scoreTopologyCorrectness(actual, expected);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it('scores 0 when no actual event matches — different event_id and no rule UUID overlap', () => {
    // Different event_id prevents exact-id match; different rule UUID prevents overlap match.
    const actual = [event('other', ['uuid-X'], ['svc-a'], [])] as unknown as SignificantEvent[];
    const expected = [event('e1', ['uuid-1'], ['svc-a'], [])];

    const result = scoreTopologyCorrectness(actual, expected);
    expect(result.score).toBe(0);
    expect(result.explanation).toMatch(/no matching actual event/);
  });

  it('does not match an actual whose only shared rule UUID is refuted', () => {
    // dismissed shares R1 with the expected event but its signal is refuted.
    // open has the same R1 confirming and the correct topology.
    // Without the confirming filter the dismisssed event wins the overlap race;
    // with it, only open qualifies.
    const refutedSignal = { ...signal('R1'), verdict: 'refutes' as const };
    const dismissed = {
      event_id: 'dismissed-1',
      status: 'dismissed' as const,
      signals: [refutedSignal],
      causal_features: [feature('userservice')],
      blast_radius: [],
    } as unknown as SignificantEvent;
    const open = event('open-1', ['R1'], ['transactionhistory'], []) as unknown as SignificantEvent;

    const expected = [event('cascade', ['R1'], ['transactionhistory'], [])];
    const result = scoreTopologyCorrectness([dismissed, open], expected);
    expect(result.score).toBe(1);
  });

  it('prefers exact event_id match over highest rule UUID overlap', () => {
    // byId shares event_id='cascade' with the expected event but a different rule (R2);
    // byOverlap has matching rule R1 but a different event_id.
    // Correct topology lives on byId; without event_id priority byOverlap wins the
    // overlap race and the wrong causal_features are scored.
    const byId = event(
      'cascade',
      ['R2'],
      ['transactionhistory'],
      []
    ) as unknown as SignificantEvent;
    const byOverlap = event('other', ['R1'], ['userservice'], []) as unknown as SignificantEvent;

    const expected = [event('cascade', ['R1'], ['transactionhistory'], [])];
    const result = scoreTopologyCorrectness([byId, byOverlap], expected);
    expect(result.score).toBe(1);
  });

  it('does not double-count: two expected events cannot claim the same actual', () => {
    // Both expected events share rule uuids with the single actual — without the fix both
    // would match it and score 1.0 each (totalScore=2, avg=1.0 even though e2 is missing).
    const actualItem = event('e1', ['uuid-shared'], ['svc-a'], []) as unknown as SignificantEvent;
    const exp1 = event('e1', ['uuid-shared'], ['svc-a'], []);
    const exp2 = event('e2', ['uuid-shared'], ['svc-b'], []);

    const result = scoreTopologyCorrectness([actualItem], [exp1, exp2]);
    // e1 matches actualItem; e2 finds nothing (actualItem already assigned) → score < 1
    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toMatch(/no matching actual event/);
  });

  it('does not deflate precision for duplicate feature IDs in actual', () => {
    // actual has ['svc-a', 'svc-a'] (duplicate) — with raw array length as denominator
    // precision would be 0.5 even though the unique set is exactly right.
    const actualItem = {
      ...event('e1', ['uuid-1'], [], []),
      causal_features: [feature('svc-a'), feature('svc-a')],
    } as unknown as SignificantEvent;
    const expected = [event('e1', ['uuid-1'], ['svc-a'], [])];

    const result = scoreTopologyCorrectness([actualItem], expected);
    expect(result.score).toBe(1);
  });
});

// --- topologyCorrectnessEvaluator (null label path) ---

describe('topologyCorrectnessEvaluator', () => {
  it('returns label=unavailable when score is null', async () => {
    const result = await topologyCorrectnessEvaluator.evaluate({
      input: { detections: [] },
      output: { significantEvents: [], steps: [] },
      expected: {
        criteria: [],
        expected_significant_events: [{ event_id: 'e1', causal_features: [], blast_radius: [] }],
      },
    } as any);

    expect(result.score).toBeNull();
    expect((result as any).label).toBe('unavailable');
  });

  it('propagates a numeric score when topology is present', async () => {
    const actual = event('e1', ['uuid-1'], ['svc-a'], []) as unknown as SignificantEvent;
    const result = await topologyCorrectnessEvaluator.evaluate({
      input: { detections: [] },
      output: { significantEvents: [actual], steps: [] },
      expected: {
        criteria: [],
        expected_significant_events: [event('e1', ['uuid-1'], ['svc-a'], [])],
      },
    } as any);

    expect(result.score).toBe(1);
  });
});

// --- scoreContinuationTopologyStability ---

describe('scoreContinuationTopologyStability', () => {
  const makeCycle = (
    writeItems: Array<Partial<SignificantEvent>>,
    opts: Partial<ContinuationTopologyCycle> = {}
  ): ContinuationTopologyCycle => ({ writeItems, ...opts });

  it('returns null when there is no establishing cycle', () => {
    expect(scoreContinuationTopologyStability([]).score).toBeNull();
    expect(scoreContinuationTopologyStability([makeCycle([])]).score).toBeNull();
  });

  it('returns null when there are no follow-up cycles with expectReuse', () => {
    const establishing = makeCycle([event('e1', [], ['svc-a'], [])]);
    const followUp = makeCycle([event('e1', [], [], [])], { expectReuse: false });
    expect(scoreContinuationTopologyStability([establishing, followUp]).score).toBeNull();
  });

  it('scores perfect topology preservation as 1.0', () => {
    const establishing = makeCycle([event('e1', [], ['svc-a'], ['dep-1'])]);
    const followUp = makeCycle([event('e1', [], ['svc-a'], ['dep-1'])]);

    const result = scoreContinuationTopologyStability([establishing, followUp]);
    expect(result.score).toBe(1);
  });

  it('scores topology drift below 1.0', () => {
    const establishing = makeCycle([event('e1', [], ['svc-a', 'svc-b'], [])]);
    const followUp = makeCycle([event('e1', [], ['svc-a'], [])]);

    const result = scoreContinuationTopologyStability([establishing, followUp]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(1);
  });

  it('matches follow-up items to establishing items by event_id, not just index 0', () => {
    const est1 = event('e1', [], ['causal-1'], []);
    const est2 = event('e2', [], ['causal-2'], []);
    const establishing = makeCycle([est1, est2]);

    // Follow-up only rewrites e2; e2's topology matches the establishing e2 exactly.
    const followUp = makeCycle([event('e2', [], ['causal-2'], [])]);

    const result = scoreContinuationTopologyStability([establishing, followUp]);
    expect(result.score).toBe(1);
  });

  it('falls back to index 0 when follow-up event_id has no match in establishing', () => {
    const establishing = makeCycle([event('e1', [], ['svc-a'], [])]);
    const followUp = makeCycle([event('e-unknown', [], ['svc-a'], [])]);

    const result = scoreContinuationTopologyStability([establishing, followUp]);
    // Falls back to comparing e-unknown against establishing[0] (e1); topology matches → 1.0
    expect(result.score).toBe(1);
  });
});
