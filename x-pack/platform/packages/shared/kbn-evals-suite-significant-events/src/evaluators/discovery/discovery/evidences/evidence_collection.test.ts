/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, Detection, SignalEntry } from '@kbn/significant-events-schema';
import { evidenceCollectionEvaluator } from './evidence_collection';

const detection = (ruleUuid: string): Omit<Detection, 'processed'> => ({
  '@timestamp': '2026-07-17T00:00:00.000Z',
  detection_id: `${ruleUuid}-det`,
  rule_uuid: ruleUuid,
  rule_name: ruleUuid,
  stream_name: 'logs',
  change_point_type: 'spike',
  p_value: 0,
});

const detectionSignal = (
  ruleUuid: string,
  evidence: 'found' | 'no-query' | 'missing' = 'found'
): SignalEntry => ({
  type: 'detection',
  description: 'Testing: something. Expected: error. Found: 1 row. Verdict: confirms.',
  ...(evidence === 'found' ? { confirmed: true } : {}),
  stream_name: 'logs',
  ...(evidence === 'found'
    ? { evidence: { esql_query: 'FROM logs | LIMIT 1', result: 'found' as const } }
    : evidence === 'no-query'
    ? { evidence: null }
    : {}),
  metadata: {
    rule_uuid: ruleUuid,
    rule_name: ruleUuid,
    detection_id: `${ruleUuid}-det`,
    change_point_type: 'spike',
    p_value: 0,
  },
});

const evaluate = (discoveries: Partial<Discovery>[], ruleUuids: string[]) =>
  evidenceCollectionEvaluator.evaluate({
    input: {
      detections: ruleUuids.map(detection),
    },
    output: { discoveries: discoveries as Discovery[], steps: [] },
    expected: {} as never,
    metadata: null,
  });

describe('evidenceCollectionEvaluator', () => {
  it('is unavailable when there are no input detections', async () => {
    expect((await evaluate([{ signals: [] }], [])).score).toBeNull();
  });

  it('scores 1 when every input rule has collected ES|QL evidence', async () => {
    const discoveries: Partial<Discovery>[] = [
      {
        signals: [detectionSignal('r1'), detectionSignal('r2')],
      },
    ];
    const result = await evaluate(discoveries, ['r1', 'r2']);

    expect(result.score).toBe(1);
    expect(result.explanation).toContain('2 input rule(s)');
  });

  it('gives partial credit when an input rule is omitted', async () => {
    const discoveries: Partial<Discovery>[] = [
      {
        signals: [detectionSignal('r1')],
      },
    ];
    const result = await evaluate(discoveries, ['r1', 'r2']);

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('missing signal for input rule "r2"');
  });

  it.each(['no-query', 'missing'] as const)(
    'rejects %s evidence for an input rule',
    async (evidence) => {
      const result = await evaluate([{ signals: [detectionSignal('r1', evidence)] }], ['r1']);

      expect(result.score).toBe(0);
      expect(result.explanation).toContain('no ES|QL evidence for input rule "r1"');
    }
  );

  it('rejects duplicate and unexpected signals', async () => {
    const result = await evaluate(
      [
        {
          signals: [detectionSignal('r1'), detectionSignal('r1'), detectionSignal('unexpected')],
        },
      ],
      ['r1']
    );

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('duplicate signals for input rule "r1"');
    expect(result.explanation).toContain('unexpected signal for rule "unexpected"');
  });
});
