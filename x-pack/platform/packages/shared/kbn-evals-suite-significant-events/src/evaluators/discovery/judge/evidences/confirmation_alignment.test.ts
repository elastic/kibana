/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { confirmationAlignmentEvaluator } from './confirmation_alignment';

const evaluate = (
  significantEvents: unknown,
  expectedConfirmedRuleUuids?: Record<string, string[]>
) =>
  confirmationAlignmentEvaluator.evaluate({
    input: { discoveries: [] },
    output: { significantEvents, steps: [], inputDiscoveries: [] } as never,
    expected: { expected_confirmed_rule_uuids: expectedConfirmedRuleUuids } as never,
    metadata: null,
  });

const detection = (ruleUuid: string, confirmed?: boolean) => ({
  type: 'detection',
  metadata: { rule_uuid: ruleUuid },
  ...(confirmed === undefined ? {} : { confirmed }),
});

describe('confirmationAlignmentEvaluator', () => {
  it('is unavailable when no expected confirmed rule UUIDs are declared', async () => {
    const result = await evaluate([], undefined);
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });

  it('scores 1 for an exact confirmed-membership match', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1', true)] }];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('ignores signals without a rule identity', async () => {
    const events = [
      {
        event_id: 'e1',
        signals: [detection('r1', true), { type: 'esql', description: 'manual evidence' }],
      },
    ];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('fails when an expected rule is not confirmed', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1')] }];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
  });

  it('fails when a non-expected rule is not explicitly rejected', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1', true), detection('r2')] }];
    const result = await evaluate(events, { e1: ['r1'] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('r2');
    expect(result.explanation).not.toContain('undefined');
  });

  it('accepts a non-expected rule that is explicitly rejected', async () => {
    const events = [{ event_id: 'e1', signals: [detection('r1', true), detection('r2', false)] }];
    expect((await evaluate(events, { e1: ['r1'] })).score).toBe(1);
  });

  it('scores 0 and reports an expected event missing from the judge output', async () => {
    const result = await evaluate([], { e1: ['r1'] });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('missing from judge output');
  });

  it('averages across expected events', async () => {
    const events = [
      { event_id: 'e1', signals: [detection('r1', true)] },
      { event_id: 'e2', signals: [detection('r2')] },
    ];
    expect((await evaluate(events, { e1: ['r1'], e2: ['r2'] })).score).toBe(0.5);
  });
});
