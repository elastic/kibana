/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sweepPhaseRanges } from './sweep_phase_ranges';

describe('sweepPhaseRanges', () => {
  it('returns no changes for no ranges', () => {
    expect(sweepPhaseRanges([])).toEqual([]);
  });

  it('emits one change per sequential range', () => {
    expect(
      sweepPhaseRanges([
        { value: 'pending', startMs: 1, endMs: 1 },
        { value: 'active', startMs: 2, endMs: 3 },
      ])
    ).toEqual([
      { value: 'pending', atMs: 1 },
      { value: 'active', atMs: 2 },
    ]);
  });

  it('ends on the status that is still open for a flapping alert', () => {
    const changes = sweepPhaseRanges([
      { value: 'recovering', startMs: 4, endMs: 4 },
      { value: 'pending', startMs: 1, endMs: 1 },
      { value: 'active', startMs: 2, endMs: 6 },
    ]);

    expect(changes).toEqual([
      { value: 'pending', atMs: 1 },
      { value: 'active', atMs: 2 },
      { value: 'recovering', atMs: 4 },
      { value: 'active', atMs: 4 },
    ]);
  });

  it('keeps an inactive alert ending on inactive', () => {
    const changes = sweepPhaseRanges([
      { value: 'active', startMs: 2, endMs: 5 },
      { value: 'recovering', startMs: 4, endMs: 6 },
      { value: 'inactive', startMs: 7, endMs: 9 },
    ]);

    expect(changes[changes.length - 1]).toEqual({ value: 'inactive', atMs: 7 });
  });

  it('does not emit a change when a range ends without being the current one', () => {
    expect(
      sweepPhaseRanges([
        { value: 'active', startMs: 1, endMs: 10 },
        { value: 'recovering', startMs: 3, endMs: 8 },
        { value: 'pending', startMs: 5, endMs: 6 },
      ])
    ).toEqual([
      { value: 'active', atMs: 1 },
      { value: 'recovering', atMs: 3 },
      { value: 'pending', atMs: 5 },
      { value: 'recovering', atMs: 6 },
      { value: 'active', atMs: 8 },
    ]);
  });
});
