/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scoreContinuationStability } from './continuation_stability';

describe('scoreContinuationStability', () => {
  it('scores a perfect single-event-ID cascade as 1.0', () => {
    const result = scoreContinuationStability([
      { ruleName: 'r1', producedEventIds: ['svc__cascade-aaaa1111'] },
      { ruleName: 'r2', producedEventIds: ['svc__cascade-aaaa1111'] },
      { ruleName: 'r3', producedEventIds: ['svc__cascade-aaaa1111'] },
    ]);

    expect(result.score).toBe(1);
    expect(result.reusedCycles).toBe(2);
    expect(result.comparableCycles).toBe(2);
    expect(result.distinctEventIds).toBe(1);
  });

  it('scores full event ID proliferation as 0', () => {
    const result = scoreContinuationStability([
      { ruleName: 'r1', producedEventIds: ['svc__a-1111'] },
      { ruleName: 'r2', producedEventIds: ['svc__b-2222'] },
      { ruleName: 'r3', producedEventIds: ['svc__c-3333'] },
    ]);

    expect(result.score).toBe(0);
    expect(result.reusedCycles).toBe(0);
    expect(result.comparableCycles).toBe(2);
    expect(result.distinctEventIds).toBe(3);
  });

  it('gives partial credit when one follow-up reuses and one proliferates', () => {
    const result = scoreContinuationStability([
      { producedEventIds: ['svc__cascade-aaaa1111'] },
      { producedEventIds: ['svc__cascade-aaaa1111'] }, // reused
      { producedEventIds: ['svc__other-bbbb2222'] }, // new event ID
    ]);

    expect(result.score).toBe(0.5);
    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(2);
  });

  it('excludes a cycle that produced no discovery from comparableCycles, not as a reuse miss', () => {
    const result = scoreContinuationStability([
      { producedEventIds: ['svc__cascade-aaaa1111'] },
      { producedEventIds: [] }, // agent emitted nothing — different from a wrong event ID
      { producedEventIds: ['svc__cascade-aaaa1111'] },
    ]);

    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(1);
    expect(result.emptyCycles).toBe(1);
    expect(result.score).toBe(1);
  });

  it('stays gradable when only some post-establishing cycles are empty', () => {
    const result = scoreContinuationStability([
      { producedEventIds: ['svc__cascade-aaaa1111'] },
      { producedEventIds: [] },
      { producedEventIds: ['svc__other-bbbb2222'] }, // real miss — new event ID
    ]);

    expect(result.reusedCycles).toBe(0);
    expect(result.comparableCycles).toBe(1);
    expect(result.emptyCycles).toBe(1);
    expect(result.score).toBe(0);
  });

  it('returns null (not a misleadingly low score) when every follow-up cycle is empty', () => {
    const result = scoreContinuationStability([
      { producedEventIds: ['svc__cascade-aaaa1111'] },
      { producedEventIds: [] },
      { producedEventIds: [] },
    ]);

    expect(result.score).toBeNull();
    expect(result.comparableCycles).toBe(0);
    expect(result.emptyCycles).toBe(2);
  });

  it('skips leading empty cycles so the first producing cycle establishes the event', () => {
    const result = scoreContinuationStability([
      { producedEventIds: [] },
      { producedEventIds: ['svc__cascade-aaaa1111'] }, // establishing
      { producedEventIds: ['svc__cascade-aaaa1111'] }, // reused
    ]);

    expect(result.comparableCycles).toBe(1);
    expect(result.reusedCycles).toBe(1);
    expect(result.score).toBe(1);
  });

  it('returns null when there are fewer than two gradable cycles', () => {
    expect(scoreContinuationStability([]).score).toBeNull();
    expect(scoreContinuationStability([{ producedEventIds: ['svc__only-1111'] }]).score).toBeNull();
  });

  it('treats an event ID introduced mid-run and reused later as continuation of itself', () => {
    const result = scoreContinuationStability([
      { producedEventIds: ['svc__a-1111'] },
      { producedEventIds: ['svc__b-2222'] }, // new (miss)
      { producedEventIds: ['svc__b-2222'] }, // reuses b (hit)
    ]);

    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(2);
    expect(result.score).toBe(0.5);
    expect(result.distinctEventIds).toBe(2);
  });
});
