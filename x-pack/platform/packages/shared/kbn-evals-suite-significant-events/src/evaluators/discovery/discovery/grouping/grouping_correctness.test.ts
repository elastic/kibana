/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { groupingCorrectnessEvaluator } from './grouping_correctness';

// Only `rule_uuid` matters to this evaluator (grouping is judged by rule_uuid membership per
// discovery) — cast past the full `Discovery['detections']` shape rather than filling in
// unused required fields, matching the `evaluate()` helper's casts below.
const buildDiscovery = (...ruleUuids: string[]): Partial<Discovery> => ({
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

// The expected grouping is derived from `expected_discoveries`, so build them from the gold groups.
// The evaluator only reads output.discoveries[].signals and expected.expected_discoveries[].signals.
const evaluate = (discoveries: Array<Partial<Discovery>>, expectedGroups?: string[][]) =>
  groupingCorrectnessEvaluator.evaluate({
    input: {
      detections: [] as Detection[],
    },
    output: { discoveries: discoveries as unknown as Discovery[], steps: [] },
    expected: {
      criteria: [],
      expected_discoveries: expectedGroups?.map((group) =>
        buildDiscovery(...group)
      ) as unknown as Discovery[],
    },
    metadata: null,
  });

describe('groupingCorrectnessEvaluator', () => {
  it('is unavailable when no expected_discoveries are declared', async () => {
    expect((await evaluate([buildDiscovery('a', 'b')])).score).toBeNull();
  });

  it('scores 1.0 for an exactly matching grouping', async () => {
    const result = await evaluate(
      [buildDiscovery('a', 'b'), buildDiscovery('c')],
      [['a', 'b'], ['c']]
    );
    expect(result.score).toBe(1);
  });

  it('scores 1.0 when all rules are correctly separate', async () => {
    const result = await evaluate([buildDiscovery('a'), buildDiscovery('b')], [['a'], ['b']]);
    expect(result.score).toBe(1);
  });

  it('scores 0 when rules that should be grouped were split', async () => {
    const result = await evaluate([buildDiscovery('a'), buildDiscovery('b')], [['a', 'b']]);
    expect(result.score).toBe(0);
  });

  it('gives partial credit for a partially-correct partition', async () => {
    // expected: {a,b,c} together (3 pairs). actual: {a,b} + {c} → 1 of 3 pairs correct, no false pairs.
    const result = await evaluate(
      [buildDiscovery('a', 'b'), buildDiscovery('c')],
      [['a', 'b', 'c']]
    );
    // precision 1 (1/1), recall 1/3 → F1 = 0.5
    expect(result.score).toBeCloseTo(0.5, 5);
  });

  it('is unavailable when expected and actual rule universes are disjoint (snapshot catalog mismatch)', async () => {
    // The snapshot variant feeds a different detection catalog, so actual rules (x,y,z) share nothing
    // with the canonical expected rules (a,b,c) — grouping cannot be scored across disjoint universes.
    const result = await evaluate(
      [buildDiscovery('x', 'y'), buildDiscovery('z')],
      [['a', 'b'], ['c']]
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });
});
