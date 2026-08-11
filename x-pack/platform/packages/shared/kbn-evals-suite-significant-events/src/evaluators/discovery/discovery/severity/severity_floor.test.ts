/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, SignificantEvent, SignalEntry } from '@kbn/significant-events-schema';
import { severityFloorEvaluator } from './severity_floor';

const evaluate = (
  events: Array<Partial<SignificantEvent>>,
  expectedEvents?: Array<Partial<SignificantEvent>>
) =>
  severityFloorEvaluator.evaluate({
    input: { detections: [] as Detection[] },
    output: { significantEvents: events as SignificantEvent[], steps: [] },
    expected: {
      criteria: [],
      expected_significant_events: expectedEvents as SignificantEvent[],
    },
    metadata: null,
  });

const balanceReaderSignal: SignalEntry = {
  type: 'detection',
  stream_name: 'logs',
  description: 'Balance reader connectivity failure',
  metadata: {
    rule_uuid: '3c4bf4f9-9ed9-567f-be35-332eb79ee76a',
    rule_name: 'Frontend → Balance Reader Connection Failures',
    detection_id: '123',
    change_point_type: 'spike',
    p_value: 0.01,
  },
};

describe('severityFloorEvaluator', () => {
  it('is unavailable when no expected open severities are declared', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '80-critical', title: 'A' }],
      [{ status: 'dismissed', severity: '20-low', title: 'A' }]
    );
    expect(result.score).toBeNull();
  });

  it('scores 1.0 when actual severity meets the expected floor', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '80-critical', title: 'Ledger failure' }],
      [{ status: 'open', severity: '60-high', title: 'Ledger failure' }]
    );
    expect(result.score).toBe(1);
  });

  it('scores 1.0 when actual severity exactly matches the floor', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }],
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }]
    );
    expect(result.score).toBe(1);
  });

  it('matches by rule_uuid when titles differ', async () => {
    const result = await evaluate(
      [
        {
          status: 'open',
          severity: '80-critical',
          title: 'Balance and ledger processing — core transaction submission failures',
          signals: [balanceReaderSignal],
        },
      ],
      [
        {
          status: 'open',
          severity: '60-high',
          title: 'Balance reader — account balance lookup connectivity failure',
          signals: [balanceReaderSignal],
        },
      ]
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when actual severity is below the expected floor', async () => {
    const result = await evaluate(
      [
        {
          status: 'open',
          severity: '40-medium',
          title: 'Different title',
          signals: [balanceReaderSignal],
        },
      ],
      [
        {
          status: 'open',
          severity: '60-high',
          title: 'Balance reader connectivity failure',
          signals: [balanceReaderSignal],
        },
      ]
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('under-severity');
  });

  it('scores 0 when no open event matches expected rule ownership', async () => {
    const result = await evaluate(
      [
        {
          status: 'open',
          severity: '80-critical',
          title: 'Different event',
          signals: [
            {
              ...balanceReaderSignal,
              metadata: {
                rule_uuid: 'other-rule-uuid',
                detection_id: '456',
                change_point_type: 'spike',
                p_value: 0.01,
              },
            },
          ],
        },
      ],
      [
        {
          status: 'open',
          severity: '60-high',
          title: 'Balance reader connectivity failure',
          signals: [balanceReaderSignal],
        },
      ]
    );
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('rule_uuid');
  });

  it('falls back to title matching when expected event has no rule_uuid signals', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }],
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }]
    );
    expect(result.score).toBe(1);
  });
});
