/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildStablePhaseColumns } from './stable_phase_columns';
import type { LifecyclePhase } from './lifecycle_types';

const phase = (name: string, grow: LifecyclePhase['grow'], min_age: string): LifecyclePhase => ({
  name,
  label: name,
  color: '#000000',
  grow,
  min_age,
});

const deletePhase = (min_age: string): LifecyclePhase => ({
  name: 'delete',
  label: 'delete',
  color: '#000000',
  grow: false,
  isDelete: true,
  min_age,
});

const frozenPhase = (grow: LifecyclePhase['grow'], min_age: string): LifecyclePhase => ({
  name: 'frozen',
  label: 'Frozen',
  color: '#000000',
  grow,
  min_age,
  isFrozen: true,
});

describe('buildStablePhaseColumns', () => {
  it('always emits the five canonical slots with sequential column starts', () => {
    const { slots } = buildStablePhaseColumns([phase('hot', 5, '0d')]);

    expect(slots).toHaveLength(5);
    expect(slots.map((s) => s.slot)).toEqual(['hot', 'warm', 'cold', 'frozen', 'delete']);
    expect(slots.map((s) => s.columnStart)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses absent phases to zero-width tracks (0fr, and 0px for delete)', () => {
    const { gridTemplateColumns, slots } = buildStablePhaseColumns([phase('hot', 5, '0d')]);

    expect(gridTemplateColumns).toBe('5fr 0fr 0fr 0fr 0px');
    // Absent slots carry a null phase so the bar can still render them as placeholders.
    expect(slots[1].phase).toBeNull();
    expect(slots[1].phaseIndex).toBeNull();
    expect(slots[4].phase).toBeNull();
  });

  it('uses a fixed 50px track for a present delete phase', () => {
    const { gridTemplateColumns, slots } = buildStablePhaseColumns([
      phase('hot', 5, '0d'),
      deletePhase('30d'),
    ]);

    expect(gridTemplateColumns).toBe('5fr 0fr 0fr 0fr 50px');
    expect(slots[4].phase).not.toBeNull();
    expect(slots[4].phaseIndex).toBe(1);
  });

  it('maps hot/warm/cold/delete to their canonical slots keeping proportional widths', () => {
    const phases = [
      phase('hot', 5, '0d'),
      phase('warm', 3, '10d'),
      phase('cold', 2, '20d'),
      deletePhase('30d'),
    ];

    const { gridTemplateColumns, slots, timelineSegments, phaseColumnStarts } =
      buildStablePhaseColumns(phases);

    expect(gridTemplateColumns).toBe('5fr 3fr 2fr 0fr 50px');
    expect(slots.map((s) => s.phaseIndex)).toEqual([0, 1, 2, null, 3]);
    // Timeline segments are placed at the same canonical columns as the phases.
    expect(timelineSegments.map((s) => s.columnStart)).toEqual([1, 2, 3, 5]);
    // The downsampling row reuses the same per-phase columns (delete jumps to the fixed column 5).
    expect(phaseColumnStarts).toEqual([1, 2, 3, 5]);
  });

  it('places a frozen phase in the frozen slot, leaving warm/cold as zero-width gaps', () => {
    const phases = [phase('hot', 5, '0d'), frozenPhase(4, '10d'), deletePhase('30d')];

    const { gridTemplateColumns, slots, timelineSegments, phaseColumnStarts } =
      buildStablePhaseColumns(phases);

    expect(gridTemplateColumns).toBe('5fr 0fr 0fr 4fr 50px');
    expect(slots.map((s) => s.phaseIndex)).toEqual([0, null, null, 1, 2]);
    expect(timelineSegments.map((s) => s.columnStart)).toEqual([1, 4, 5]);
    // hot at column 1, frozen at column 4, delete at column 5 (warm/cold columns 2/3 are gaps).
    expect(phaseColumnStarts).toEqual([1, 4, 5]);
  });
});
