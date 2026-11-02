/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { resolveLifecycleGridLayout } from './lifecycle_grid_layout';
import { buildStablePhaseColumns } from './stable_phase_columns';
import type { LifecyclePhase } from './lifecycle_types';

const hot: LifecyclePhase = { name: 'hot', label: 'Hot', color: '#000', grow: true, min_age: '0d' };
const warm: LifecyclePhase = {
  name: 'warm',
  label: 'Warm',
  color: '#000',
  grow: 3,
  min_age: '7d',
};
const deletePhase = (minAge: string): LifecyclePhase => ({
  name: 'delete',
  label: 'delete',
  color: '#000',
  grow: false,
  isDelete: true,
  min_age: minAge,
});

const steps: DownsampleStep[] = [
  { after: '1d', fixed_interval: '1h' },
  { after: '3d', fixed_interval: '1d' },
];

describe('resolveLifecycleGridLayout', () => {
  it('uses the canonical phase layout for all rows when there are no DSL steps', () => {
    const phases = [hot, warm, deletePhase('30d')];
    const canonical = buildStablePhaseColumns(phases);
    const layout = resolveLifecycleGridLayout(phases, undefined, false);

    expect(layout.stableSlots).toEqual(canonical.slots);
    expect(layout.phaseGridTemplateColumns).toBe(canonical.gridTemplateColumns);
    expect(layout.stepsGridTemplateColumns).toBe(canonical.gridTemplateColumns);
    expect(layout.downsamplingColumnStarts).toEqual(canonical.phaseColumnStarts);
    expect(layout.timelineSegments).toEqual(canonical.timelineSegments);
    expect(layout.downsamplingSegments).toBeNull();
  });

  it('keeps the canonical phase bar but uses the aligned sub-grid for DSL step rows', () => {
    const phases = [hot, deletePhase('30d')];
    const canonical = buildStablePhaseColumns(phases);
    const layout = resolveLifecycleGridLayout(phases, steps, true);

    // Phase bar stays canonical so it interpolates on source switch...
    expect(layout.phaseGridTemplateColumns).toBe(canonical.gridTemplateColumns);
    expect(layout.stableSlots).toEqual(canonical.slots);
    // ...while the step/timeline rows use the finer sub-grid: three hot regions (cols 1-3), then the
    // reserved frozen column (4), so delete lands at column 5.
    expect(layout.stepsGridTemplateColumns).not.toBe(canonical.gridTemplateColumns);
    expect(layout.downsamplingColumnStarts).toEqual([1, 2, 3, 5]);
    expect(layout.downsamplingSegments).not.toBeNull();
  });

  it('falls back to a single dynamic grid shared by all rows when the sub-grid does not fit', () => {
    const phases = [hot, deletePhase('5d')];
    // A step after retention can't be mapped onto the aligned sub-grid.
    const lateSteps: DownsampleStep[] = [
      { after: '1d', fixed_interval: '1h' },
      { after: '10d', fixed_interval: '1d' },
    ];
    const layout = resolveLifecycleGridLayout(phases, lateSteps, true);

    expect(layout.stableSlots).toBeUndefined();
    expect(layout.downsamplingColumnStarts).toBeUndefined();
    expect(layout.phaseGridTemplateColumns).toBe(layout.stepsGridTemplateColumns);
  });

  it('does not build downsampling segments when downsampling is hidden', () => {
    const phases = [hot, deletePhase('30d')];
    const layout = resolveLifecycleGridLayout(phases, steps, false);

    expect(layout.downsamplingSegments).toBeNull();
    // Without DSL steps in play, rows use the canonical grid.
    expect(layout.stepsGridTemplateColumns).toBe(layout.phaseGridTemplateColumns);
  });
});
