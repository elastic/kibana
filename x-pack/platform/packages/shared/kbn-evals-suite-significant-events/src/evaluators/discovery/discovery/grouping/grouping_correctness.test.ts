/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import { groupingCorrectnessEvaluator } from './grouping_correctness';

// Only `rule_uuid` matters to this evaluator (grouping is judged by rule_uuid membership per
// event) — cast past the full shape rather than filling in unused required fields.
const buildEvent = (...ruleUuids: string[]): Partial<SignificantEvent> => ({
  status: 'open',
  signals: ruleUuids.map(
    (rule_uuid): SignalEntry => ({
      type: 'detection',
      stream_name: 'logs',
      confirmed: true,
      description: 'Testing: something.',
      metadata: {
        rule_uuid,
        detection_id: 'detection-1',
        change_point_type: 'spike',
        p_value: 0.01,
      },
    })
  ),
});

// The expected grouping is derived from `expected_significant_events`, so build them from the gold groups.
const evaluate = (events: Array<Partial<SignificantEvent>>, expectedGroups?: string[][]) =>
  groupingCorrectnessEvaluator.evaluate({
    input: {
      detections: [] as Detection[],
    },
    output: { significantEvents: events as unknown as SignificantEvent[], steps: [] },
    expected: {
      criteria: [],
      expected_significant_events: expectedGroups?.map((group) =>
        buildEvent(...group)
      ) as unknown as SignificantEvent[],
    },
    metadata: null,
  });

describe('groupingCorrectnessEvaluator', () => {
  it('is unavailable when no expected_significant_events are declared', async () => {
    expect((await evaluate([buildEvent('a', 'b')])).score).toBeNull();
  });

  it('scores 1.0 for an exactly matching grouping', async () => {
    const result = await evaluate([buildEvent('a', 'b'), buildEvent('c')], [['a', 'b'], ['c']]);
    expect(result.score).toBe(1);
  });

  it('scores 1.0 when all rules are correctly separate', async () => {
    const result = await evaluate([buildEvent('a'), buildEvent('b')], [['a'], ['b']]);
    expect(result.score).toBe(1);
  });

  it('ignores valid standalone signals outside the declared expected event universe', async () => {
    const result = await evaluate(
      [buildEvent('a', 'b'), { ...buildEvent('unrelated-positive'), status: 'dismissed' }],
      [['a', 'b']]
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when independent rules were merged', async () => {
    const result = await evaluate([buildEvent('a', 'b')], [['a'], ['b']]);
    expect(result.score).toBe(0);
  });

  it('scores 0 when rules that should be grouped were split', async () => {
    const result = await evaluate([buildEvent('a'), buildEvent('b')], [['a', 'b']]);
    expect(result.score).toBe(0);
  });

  it('scores 0 when a rule is assigned to both a continuation and a new event', async () => {
    const result = await evaluate([buildEvent('a', 'b'), buildEvent('b')], [['a', 'b']]);
    expect(result.score).toBe(0);
    expect(result.label).toBe('duplicate-rule-assignment');
  });

  it('scores 0 when an expected rule is not assigned to any event', async () => {
    const result = await evaluate([buildEvent('a')], [['a'], ['b']]);
    expect(result.score).toBe(0);
    expect(result.label).toBe('incomplete-rule-assignment');
  });

  it('scores 0 when no events are emitted', async () => {
    const result = await evaluate([], [['a']]);
    expect(result.score).toBe(0);
    expect(result.label).toBe('missing-all-rule-assignments');
  });

  it('gives partial credit for a partially-correct partition', async () => {
    // expected: {a,b,c} together (3 pairs). actual: {a,b} + {c} → 1 of 3 pairs correct, no false pairs.
    const result = await evaluate([buildEvent('a', 'b'), buildEvent('c')], [['a', 'b', 'c']]);
    // precision 1 (1/1), recall 1/3 → F1 = 0.5
    expect(result.score).toBeCloseTo(0.5, 5);
  });

  it('penalizes merging unrelated failure, exposure, and health groups', async () => {
    const result = await evaluate(
      [
        buildEvent(
          'rule-charge-failure',
          'rule-pci-exposed',
          'rule-card-metadata',
          'rule-email-pii',
          'rule-checkout-success'
        ),
      ],
      [
        ['rule-charge-failure'],
        ['rule-pci-exposed', 'rule-card-metadata', 'rule-email-pii'],
        ['rule-checkout-success'],
      ]
    );
    expect(result.score).toBeLessThan(0.5);
  });

  it('is unavailable when expected and actual rule universes are disjoint (snapshot catalog mismatch)', async () => {
    const result = await evaluate([buildEvent('x', 'y'), buildEvent('z')], [['a', 'b'], ['c']]);
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });
});
