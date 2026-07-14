/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { evidenceCollectionEvaluator } from './evidence_collection';

const detectionSignal = (ruleUuid: string, ruleName?: string, hasEvidence = true): SignalEntry => ({
  type: 'detection',
  description: 'Testing: something. Expected: error. Found: 1 row. Verdict: confirms.',
  ...(hasEvidence
    ? { evidence: { esql_query: 'FROM logs | LIMIT 1', result: 'found', row_count: 1 } }
    : {}),
  metadata: { kind: 'detection', rule_uuid: ruleUuid, rule_name: ruleName },
});

const evaluate = (discoveries: Partial<Discovery>[]) =>
  evidenceCollectionEvaluator.evaluate({
    input: {
      detections: [] as Detection[],
    },
    output: { discoveries: discoveries as Discovery[], steps: [] },
    expected: {} as never,
    metadata: null,
  });

const createDetection = (
  ruleUuid: string,
  extra: Partial<Discovery['detections'][number]> = {}
): Discovery['detections'][number] => ({
  detection_id: `${ruleUuid}-det`,
  rule_uuid: ruleUuid,
  rule_name: ruleUuid,
  change_point_type: 'spike',
  p_value: 0,
  ...extra,
});

describe('evidenceCollectionEvaluator', () => {
  it('is unavailable when there are no detection signals', async () => {
    expect((await evaluate([{ signals: [] }])).score).toBeNull();
  });

  it('scores 1 when every rule has embedded evidence', async () => {
    const discoveries: Partial<Discovery>[] = [
      {
        signals: [detectionSignal('r1'), detectionSignal('r2')],
      },
    ];
    expect((await evaluate(discoveries)).score).toBe(1);
  });

  it('gives partial credit when a rule has no evidence', async () => {
    const discoveries: Partial<Discovery>[] = [
      {
        signals: [detectionSignal('r1', 'A', true), detectionSignal('r2', 'B', false)],
      },
    ];
    expect((await evaluate(discoveries)).score).toBe(0.5);
  });

  it('scores 0 when a discovery emits detection signals but no evidence', async () => {
    const discoveries: Partial<Discovery>[] = [
      { signals: [detectionSignal('r1', undefined, false)] },
    ];
    expect((await evaluate(discoveries)).score).toBe(0);
  });
});
