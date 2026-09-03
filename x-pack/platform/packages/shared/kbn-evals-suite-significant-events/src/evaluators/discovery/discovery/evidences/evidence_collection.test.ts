/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, Detection, SignalEntry } from '@kbn/significant-events-schema';
import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { memoryToolIds } from '../../utils/tool_usage';
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
  evidence: 'found' | 'quiet' | 'missing' = 'found'
): SignalEntry => ({
  type: 'detection',
  description:
    evidence === 'quiet'
      ? 'No backed query KI matched this detection.'
      : 'Found: checkout payment timeout to payment API. Impact: checkout requests fail.',
  verdict:
    evidence === 'found' ? 'confirms' : evidence === 'quiet' ? 'not_checked' : 'inconclusive',
  stream_name: 'logs',
  ...(evidence === 'found'
    ? { evidence: { esql_query: 'FROM logs | LIMIT 1', result: 'found' as const } }
    : evidence === 'quiet'
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

const evaluate = (
  events: Partial<SignificantEvent>[],
  ruleUuids: string[],
  steps: ConverseStep[] = []
) =>
  evidenceCollectionEvaluator.evaluate({
    input: {
      detections: ruleUuids.map(detection),
    },
    output: {
      significantEvents: events as SignificantEvent[],
      steps,
    },
    expected: {} as never,
    metadata: null,
  });

describe('evidenceCollectionEvaluator', () => {
  it('is unavailable when there are no input detections', async () => {
    expect((await evaluate([{ signals: [] }], [])).score).toBeNull();
  });

  it('scores 1 when every input rule has collected ES|QL evidence', async () => {
    const events: Partial<SignificantEvent>[] = [
      {
        signals: [detectionSignal('r1'), detectionSignal('r2')],
      },
    ];
    const result = await evaluate(events, ['r1', 'r2']);

    expect(result.score).toBe(1);
    expect(result.explanation).toContain('2 input rule(s)');
  });

  it('gives partial credit when an input rule is omitted', async () => {
    const events: Partial<SignificantEvent>[] = [
      {
        signals: [detectionSignal('r1')],
      },
    ];
    const result = await evaluate(events, ['r1', 'r2']);

    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('missing signal for input rule "r2"');
  });

  it('accepts an explicitly quiet signal with no backed query KI', async () => {
    const result = await evaluate([{ signals: [detectionSignal('r1', 'quiet')] }], ['r1']);

    expect(result.score).toBe(1);
  });

  it.each(['missing'] as const)('rejects %s evidence for an input rule', async (evidence) => {
    const result = await evaluate([{ signals: [detectionSignal('r1', evidence)] }], ['r1']);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('no ES|QL evidence for input rule "r1"');
  });

  it('rejects duplicate signals', async () => {
    const result = await evaluate(
      [
        {
          signals: [detectionSignal('r1'), detectionSignal('r1')],
        },
      ],
      ['r1']
    );

    expect(result.score).toBe(0);
    expect(result.explanation).toContain('duplicate signals for input rule "r1"');
  });

  it('rejects detection signals whose UUID is not in the input batch', async () => {
    const result = await evaluate([{ signals: [detectionSignal('unexpected')] }], ['r1']);

    expect(result).toMatchObject({ score: 0, label: 'unexpected-rule-uuid' });
    expect(result.explanation).toContain('"unexpected"');
  });

  it('covers already-recorded-noise without an events_write signal when the confirmation query ran', async () => {
    const ruleUuid = 'f0886d68-d5d6-5941-ba01-449666ea5960';
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: memoryToolIds.memoryRead,
        tool_call_id: 'read',
        params: { id: 'page-1' },
        results: [
          {
            data: {
              content: `- 2026-08-19: rule_uuid ${ruleUuid} → status dismissed (false-positive)`,
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: platformCoreTools.executeEsql,
        tool_call_id: 'esql',
        params: { query: 'FROM logs | LIMIT 1' },
        results: [{ data: { columns: ['message'], values: [['expected noise']] } }],
      },
    ];

    const result = await evaluate([], [ruleUuid], steps);

    expect(result.score).toBe(1);
  });

  it('does not treat an unreadable memory page as already-recorded-noise', async () => {
    const ruleUuid = 'f0886d68-d5d6-5941-ba01-449666ea5960';
    const steps: ConverseStep[] = [
      {
        type: 'tool_call',
        tool_id: memoryToolIds.memoryRead,
        tool_call_id: 'read',
        params: { id: 'stale-page-id', name: 'known-noise' },
        results: [
          {
            data: {
              error: "Memory read failed: Memory entry with id 'stale-page-id' not found",
            },
          },
        ],
      },
      {
        type: 'tool_call',
        tool_id: platformCoreTools.executeEsql,
        tool_call_id: 'esql',
        params: { query: 'FROM logs | LIMIT 1' },
        results: [],
      },
    ];

    const result = await evaluate([], [ruleUuid], steps);

    expect(result.score).toBe(0);
    expect(result.explanation).toContain(`missing signal for input rule "${ruleUuid}"`);
  });
});
