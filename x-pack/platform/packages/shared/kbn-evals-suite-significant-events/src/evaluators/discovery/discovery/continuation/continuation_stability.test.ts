/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scoreContinuationStability } from './continuation_stability';

describe('scoreContinuationStability', () => {
  it('scores a perfect single-slug cascade as 1.0', () => {
    const result = scoreContinuationStability([
      { ruleName: 'r1', producedSlugs: ['svc__cascade-aaaa1111'] },
      { ruleName: 'r2', producedSlugs: ['svc__cascade-aaaa1111'] },
      { ruleName: 'r3', producedSlugs: ['svc__cascade-aaaa1111'] },
    ]);

    expect(result.score).toBe(1);
    expect(result.reusedCycles).toBe(2);
    expect(result.comparableCycles).toBe(2);
    expect(result.distinctSlugs).toBe(1);
  });

  it('scores full slug proliferation (a new slug every cycle) as 0', () => {
    const result = scoreContinuationStability([
      { ruleName: 'r1', producedSlugs: ['svc__a-1111'] },
      { ruleName: 'r2', producedSlugs: ['svc__b-2222'] },
      { ruleName: 'r3', producedSlugs: ['svc__c-3333'] },
    ]);

    expect(result.score).toBe(0);
    expect(result.reusedCycles).toBe(0);
    expect(result.comparableCycles).toBe(2);
    expect(result.distinctSlugs).toBe(3);
  });

  it('gives partial credit when one follow-up reuses and one proliferates', () => {
    const result = scoreContinuationStability([
      { producedSlugs: ['svc__cascade-aaaa1111'] },
      { producedSlugs: ['svc__cascade-aaaa1111'] }, // reused
      { producedSlugs: ['svc__other-bbbb2222'] }, // new slug
    ]);

    expect(result.score).toBe(0.5);
    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(2);
  });

  it('excludes a cycle that produced no discovery from comparableCycles, not as a reuse miss', () => {
    const result = scoreContinuationStability([
      { producedSlugs: ['svc__cascade-aaaa1111'] },
      { producedSlugs: [] }, // agent emitted nothing — different failure mode than wrong-slug
      { producedSlugs: ['svc__cascade-aaaa1111'] },
    ]);

    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(1);
    expect(result.emptyCycles).toBe(1);
    expect(result.score).toBe(1);
  });

  it('stays gradable when only some post-establishing cycles are empty', () => {
    const result = scoreContinuationStability([
      { producedSlugs: ['svc__cascade-aaaa1111'] },
      { producedSlugs: [] },
      { producedSlugs: ['svc__other-bbbb2222'] }, // real miss — new slug
    ]);

    expect(result.reusedCycles).toBe(0);
    expect(result.comparableCycles).toBe(1);
    expect(result.emptyCycles).toBe(1);
    expect(result.score).toBe(0);
  });

  it('returns null (not a misleadingly low score) when every follow-up cycle is empty', () => {
    const result = scoreContinuationStability([
      { producedSlugs: ['svc__cascade-aaaa1111'] },
      { producedSlugs: [] },
      { producedSlugs: [] },
    ]);

    expect(result.score).toBeNull();
    expect(result.comparableCycles).toBe(0);
    expect(result.emptyCycles).toBe(2);
  });

  it('skips leading empty cycles so the first producing cycle establishes the episode', () => {
    const result = scoreContinuationStability([
      { producedSlugs: [] },
      { producedSlugs: ['svc__cascade-aaaa1111'] }, // establishing
      { producedSlugs: ['svc__cascade-aaaa1111'] }, // reused
    ]);

    expect(result.comparableCycles).toBe(1);
    expect(result.reusedCycles).toBe(1);
    expect(result.score).toBe(1);
  });

  it('returns null when there are fewer than two gradable cycles', () => {
    expect(scoreContinuationStability([]).score).toBeNull();
    expect(scoreContinuationStability([{ producedSlugs: ['svc__only-1111'] }]).score).toBeNull();
  });

  it('treats a slug introduced mid-run and reused later as continuation of itself', () => {
    const result = scoreContinuationStability([
      { producedSlugs: ['svc__a-1111'] },
      { producedSlugs: ['svc__b-2222'] }, // new (miss)
      { producedSlugs: ['svc__b-2222'] }, // reuses b (hit)
    ]);

    expect(result.reusedCycles).toBe(1);
    expect(result.comparableCycles).toBe(2);
    expect(result.score).toBe(0.5);
    expect(result.distinctSlugs).toBe(2);
  });
});
