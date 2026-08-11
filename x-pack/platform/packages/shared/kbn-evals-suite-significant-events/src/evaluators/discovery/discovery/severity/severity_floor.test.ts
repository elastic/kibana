/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, SignificantEvent } from '@kbn/significant-events-schema';
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

  it('scores 0 when actual severity is below the expected floor', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '40-medium', title: 'Balance reader connectivity failure' }],
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }]
    );
    expect(result.score).toBe(0);
  });

  it('scores 0 when no open event matches the expected title', async () => {
    const result = await evaluate(
      [{ status: 'open', severity: '80-critical', title: 'Different event' }],
      [{ status: 'open', severity: '60-high', title: 'Balance reader connectivity failure' }]
    );
    expect(result.score).toBe(0);
  });
});
