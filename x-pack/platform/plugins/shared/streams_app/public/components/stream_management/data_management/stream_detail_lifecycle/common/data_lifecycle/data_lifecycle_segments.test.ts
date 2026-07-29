/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildPhaseTimelineSegments,
  buildDslSegments,
  buildDownsamplingSegments,
  getGridTemplateColumns,
  getPhaseColumnSpans,
  type SegmentPhase,
  type TimelineSegment,
} from './data_lifecycle_segments';
import { buildLifecyclePhases } from './lifecycle_types';

describe('buildLifecyclePhases', () => {
  it('should build phases with delete phase when retentionPeriod is provided', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#FF0000',
      size: '1.0 GB',
      retentionPeriod: '30d',
      deletePhaseDescription: 'Delete phase description',
      deletePhaseColor: '#000000',
    });

    expect(phases).toHaveLength(2);
    expect(phases[0]).toMatchObject({
      name: 'Test phase',
      color: '#FF0000',
      label: 'Test phase',
      size: '1.0 GB',
      grow: true,
      timelineValue: '30d',
      min_age: '0d',
    });
    expect(phases[1]).toMatchObject({
      name: 'delete',
      label: 'delete',
      grow: false,
      isDelete: true,
      min_age: '30d',
      description: 'Delete phase description',
      color: '#000000',
    });
  });

  it('should build phases without delete phase when retentionPeriod is undefined (infinite)', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#00FF00',
      size: '2.0 GB',
      retentionPeriod: undefined,
      deletePhaseColor: '#000000',
    });

    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({
      name: 'Test phase',
      color: '#00FF00',
      label: 'Test phase',
      size: '2.0 GB',
      grow: true,
      timelineValue: undefined,
      min_age: '0d',
    });
  });

  it('should include frozen phase when frozenAfter is provided', () => {
    const phases = buildLifecyclePhases({
      label: 'Hot',
      color: '#FF0000',
      retentionPeriod: '90d',
      frozenAfter: '30d',
      frozenLabel: 'frozen',
      frozenColor: '#00FFFF',
      frozenDescription: 'Frozen description',
      deletePhaseColor: '#000000',
    });

    expect(phases).toHaveLength(3);
    expect(phases[0]).toMatchObject({ label: 'Hot', min_age: '0d' });
    expect(phases[1]).toMatchObject({
      label: 'frozen',
      min_age: '30d',
      description: 'Frozen description',
    });
    expect(phases[2]).toMatchObject({ isDelete: true, min_age: '90d' });
  });

  it('should include a frozen phase configured to freeze immediately (0d)', () => {
    const phases = buildLifecyclePhases({
      label: 'Hot',
      color: '#FF0000',
      retentionPeriod: '90d',
      frozenAfter: '0d',
      frozenLabel: 'frozen',
      frozenColor: '#00FFFF',
      frozenDescription: 'Frozen description',
      deletePhaseColor: '#000000',
    });

    expect(phases).toHaveLength(3);
    expect(phases[1]).toMatchObject({ label: 'frozen', min_age: '0d' });
  });

  it('should attach per-phase size and docs to hot and frozen phases', () => {
    const phases = buildLifecyclePhases({
      label: 'Hot',
      color: '#FF0000',
      retentionPeriod: '90d',
      size: '1.0 GB',
      sizeInBytes: 1_000_000_000,
      docsCount: 1000,
      frozenAfter: '30d',
      frozenLabel: 'frozen',
      frozenColor: '#00FFFF',
      frozenSize: '5.0 GB',
      frozenSizeInBytes: 5_000_000_000,
      frozenDocsCount: 5000,
      deletePhaseColor: '#000000',
    });

    expect(phases[0]).toMatchObject({
      label: 'Hot',
      size: '1.0 GB',
      sizeInBytes: 1_000_000_000,
      docsCount: 1000,
    });
    expect(phases[1]).toMatchObject({
      label: 'frozen',
      size: '5.0 GB',
      sizeInBytes: 5_000_000_000,
      docsCount: 5000,
    });
  });

  it('should build phases without size when size is not provided', () => {
    const phases = buildLifecyclePhases({
      label: 'Test phase',
      color: '#FF0000',
      retentionPeriod: '7d',
      deletePhaseColor: '#000000',
    });

    expect(phases).toHaveLength(2);
    const [firstPhase] = phases;
    if (firstPhase.isDelete) {
      throw new Error('Expected a non-delete phase');
    }
    expect(firstPhase.size).toBeUndefined();
  });

  it('should extract unit from retentionPeriod for min_age', () => {
    const phasesWithMinutes = buildLifecyclePhases({
      label: 'Test',
      color: '#FF0000',
      retentionPeriod: '30m',
      deletePhaseColor: '#000000',
    });
    expect(phasesWithMinutes[0].min_age).toBe('0m');

    const phasesWithSeconds = buildLifecyclePhases({
      label: 'Test',
      color: '#FF0000',
      retentionPeriod: '60s',
      deletePhaseColor: '#000000',
    });
    expect(phasesWithSeconds[0].min_age).toBe('0s');

    const phasesWithHours = buildLifecyclePhases({
      label: 'Test',
      color: '#FF0000',
      retentionPeriod: '24h',
      deletePhaseColor: '#000000',
    });
    expect(phasesWithHours[0].min_age).toBe('0h');
  });
});

describe('Segment Utilities', () => {
  describe('buildPhaseTimelineSegments', () => {
    it('should convert phases to timeline segments', () => {
      const phases: SegmentPhase[] = [
        { grow: 5, min_age: '0d' },
        { grow: 3, min_age: '30d' },
        { grow: false, min_age: '60d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ grow: 5, leftValue: '0d', isDelete: undefined });
      expect(segments[1]).toEqual({ grow: 3, leftValue: '30d', isDelete: undefined });
      expect(segments[2]).toEqual({ grow: false, leftValue: '60d', isDelete: true });
    });

    it('should match the beginning value unit to the second non-delete phase min_age', () => {
      const phases: SegmentPhase[] = [
        { grow: 5, min_age: '0ms' },
        { grow: 3, min_age: '30d' },
        { grow: false, min_age: '90d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      expect(segments[0]).toEqual({ grow: 5, leftValue: '0d', isDelete: undefined });
      expect(segments[1]).toEqual({ grow: 3, leftValue: '30d', isDelete: undefined });
    });

    it('should keep original min_age when there is only one non-delete phase', () => {
      const phases: SegmentPhase[] = [
        { grow: 5, min_age: '0ms' },
        { grow: false, min_age: '30d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      expect(segments[0]).toEqual({ grow: 5, leftValue: '0ms', isDelete: undefined });
    });

    it('should preserve explicit numeric grow values (ILM path)', () => {
      const phases: SegmentPhase[] = [
        { grow: 5, min_age: '0d' },
        { grow: 3, min_age: '30d' },
        { grow: false, min_age: '60d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      // Explicit grows are untouched (only the DSL `grow: true` case is recomputed).
      expect(segments[0].grow).toBe(5);
      expect(segments[1].grow).toBe(3);
    });

    it('sizes DSL hot/frozen proportionally to their durations when grow is true', () => {
      // hot spans [0d, 10d) and frozen spans [10d, 30d): frozen is twice as long as hot, so it
      // should get a larger grow value rather than both rendering at equal width.
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '10d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      const hotGrow = Number(segments[0].grow);
      const frozenGrow = Number(segments[1].grow);
      expect(frozenGrow).toBeGreaterThan(hotGrow);
      // Delete column keeps its fixed (non-grow) sizing.
      expect(segments[2].isDelete).toBe(true);
    });

    it('clamps an out-of-order (negative-duration) phase to the grow floor of 2', () => {
      // frozen_after (20d) is after retention/delete (10d), so frozen's [20d, 10d) range is negative
      // and falls back to the grow floor. That floor must be 2 (matching ILM) so the phase never
      // collapses to a 1fr sliver that crowds its label against the neighbour.
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '20d', label: 'frozen' },
        { grow: false, min_age: '10d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      expect(segments[1].grow).toBe(2);
      // The in-order hot phase keeps a larger weight than the floor.
      expect(Number(segments[0].grow)).toBeGreaterThan(2);
    });

    it('keeps an invalid (negative) frozen phase with its typed label, collapsing hot to the floor', () => {
      // frozen_after=-1d clamps to the start (0d), so hot collapses to a floor-2 sliver while frozen
      // spans the rest; the typed '-1d' label and the `isFrozen` tag are preserved for the timeline.
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '-1d', label: 'frozen', isFrozen: true },
        { grow: false, min_age: '30d', isDelete: true },
      ];

      const segments = buildPhaseTimelineSegments(phases);

      expect(segments[0].grow).toBe(2);
      expect(segments[1].leftValue).toBe('-1d');
      expect(segments[1].isFrozen).toBe(true);
    });
  });

  describe('buildDslSegments', () => {
    it('should build segments for DSL with downsampling steps', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d' },
        { grow: false, min_age: '60d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '10d', fixed_interval: '1h' },
        { after: '30d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.timelineSegments).toHaveLength(4);
      expect(result.downsamplingSegments).toHaveLength(4);
      expect(result.timelineSegments[0].leftValue).toBe('0d');
      expect(result.timelineSegments[1].leftValue).toBe('10d');
      expect(result.timelineSegments[2].leftValue).toBe('30d');
      expect(result.timelineSegments[3].isDelete).toBe(true);
    });

    it('should preserve downsample step array order even when a later step starts at 0d', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d' },
        { grow: false, min_age: '60d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '10d', fixed_interval: '1h' },
        { after: '0d', fixed_interval: '1d' },
        { after: '30d', fixed_interval: '2d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // The "0d" step is second in the array; it must not be moved to the first boundary.
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0d',
        '10d',
        '0d',
        '30d',
        '60d',
      ]);
      const stepIndicesInOrder = result.downsamplingSegments
        .filter((s) => s.stepIndex !== undefined)
        .map((s) => s.stepIndex);
      expect(stepIndicesInOrder).toEqual([0, 1, 2]);
    });

    it('adds the frozen phase min_age as a timeline boundary after the downsample steps', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '10d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1d', fixed_interval: '1h' },
        { after: '2d', fixed_interval: '1h' },
        { after: '4d', fixed_interval: '1h' },
        { after: '8d', fixed_interval: '1h' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // The frozen boundary (10d) must appear between the last step (8d) and retention (30d).
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0d',
        '1d',
        '2d',
        '4d',
        '8d',
        '10d',
        '30d',
      ]);
      // The frozen boundary carries no downsample step.
      const frozenSegment = result.downsamplingSegments[5];
      expect(frozenSegment.stepIndex).toBeUndefined();
      expect(frozenSegment.step).toBeUndefined();
    });

    it('does not duplicate a boundary when a downsample step coincides with the frozen min_age', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '10d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '5d', fixed_interval: '1h' },
        { after: '10d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual(['0d', '5d', '10d', '30d']);
      // The 10d boundary keeps the downsample step (index 1) rather than being duplicated.
      const tenDayIndex = result.timelineSegments.findIndex((s) => s.leftValue === '10d');
      expect(result.downsamplingSegments[tenDayIndex].stepIndex).toBe(1);
    });

    it('dedupes a frozen boundary that coincides with a step expressed in a different unit', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0s', label: 'hot' },
        // frozen at 120s == the 2m downsample step below; they must collapse to one boundary.
        { grow: true, min_age: '120s', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1m', fixed_interval: '1h' },
        { after: '2m', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // Only one boundary at the 2m/120s instant — the downsample step's label is kept.
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual(['0s', '1m', '2m', '30d']);
      const coincidentIndex = result.timelineSegments.findIndex((s) => s.leftValue === '2m');
      expect(result.downsamplingSegments[coincidentIndex].stepIndex).toBe(1);
    });

    it('inserts the frozen boundary before the downsample steps when it starts earlier', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0s', label: 'hot' },
        { grow: true, min_age: '10s', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1d', fixed_interval: '1h' },
        { after: '2d', fixed_interval: '1h' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // The frozen boundary (10s) is inserted ahead of the first step (1d).
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0s',
        '10s',
        '1d',
        '2d',
        '30d',
      ]);
      // The frozen boundary carries no downsample step.
      const frozenIndex = result.timelineSegments.findIndex((s) => s.leftValue === '10s');
      expect(result.downsamplingSegments[frozenIndex].stepIndex).toBeUndefined();
      expect(result.downsamplingSegments[frozenIndex].step).toBeUndefined();
    });

    it('adds the frozen boundary when there are no downsample steps', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '10d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];

      const result = buildDslSegments(phases, []);

      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual(['0d', '10d', '30d']);
    });

    it('adds a separate 0d boundary for a frozen phase at 0d (ILM parity)', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '0d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];

      const result = buildDslSegments(phases, []);

      // frozen_after=0d gets its own 0d mark (like ILM / the non-metrics timeline) rather than
      // collapsing into the hot start, so the frozen phase visibly starts at 0d.
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual(['0d', '0d', '30d']);
    });

    it('gives a frozen phase at 0d its own 0d mark instead of the first downsample step', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '0d', label: 'frozen' },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1d', fixed_interval: '1h' },
        { after: '2d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // Two 0d columns (hot start + frozen), then the downsample steps — frozen does NOT attach to
      // the nearest step (1d).
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0d',
        '0d',
        '1d',
        '2d',
        '30d',
      ]);
    });

    it('keeps an invalid (negative) frozen phase, shown right after hot with its typed label', () => {
      // frozen_after=-1d is invalid; instead of disappearing it is positioned right after hot (its
      // position clamps to 0d) while its typed label '-1d' is preserved for display and it is tagged
      // `isFrozen` so the timeline can flag it red.
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '-1d', label: 'frozen', isFrozen: true },
        { grow: false, min_age: '30d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1d', fixed_interval: '1h' },
        { after: '2d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0d',
        '-1d',
        '1d',
        '2d',
        '30d',
      ]);
      expect(result.timelineSegments[1].isFrozen).toBe(true);
    });

    it('keeps downsample steps past retention when a later phase boundary extends the timeline', () => {
      // Out-of-order config: frozen_after=7d while delete/retention=1d. The frozen boundary extends
      // the visible timeline to 7d, so the 1d and 2d downsample steps fall inside [0, 7d] and must
      // stay visible instead of being dropped for being "after retention".
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '7d', label: 'frozen' },
        { grow: false, min_age: '1d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '1d', fixed_interval: '1h' },
        { after: '2d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      // Both downsample steps survive and the frozen boundary is present.
      expect(result.downsamplingSegments.filter((s) => s.step)).toHaveLength(2);
      expect(result.timelineSegments.map((s) => s.leftValue)).toEqual([
        '0d',
        '1d',
        '2d',
        '7d',
        '1d',
      ]);
    });

    it('keeps a downsample step past the frozen boundary when the config is out of order', () => {
      // frozen_after=20d, delete/retention=1d (out of order) with a step at 24d (beyond frozen). The
      // config is invalid, so all steps stay visible — the 24d step must not vanish just because it
      // is past the frozen boundary.
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d', label: 'hot' },
        { grow: true, min_age: '20d', label: 'frozen' },
        { grow: false, min_age: '1d', isDelete: true },
      ];
      const downsampleSteps = [{ after: '24d', fixed_interval: '1h' }];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.downsamplingSegments.filter((s) => s.step)).toHaveLength(1);
      expect(result.timelineSegments.map((s) => s.leftValue)).toContain('24d');
    });

    it('should filter out downsample steps after retention', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d' },
        { grow: false, min_age: '20d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '10d', fixed_interval: '1h' },
        { after: '30d', fixed_interval: '1d' }, // Should be filtered out (after retention)
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.downsamplingSegments.filter((s) => s.step)).toHaveLength(1);
    });

    it('should handle indefinite retention', () => {
      const phases: SegmentPhase[] = [{ grow: true, min_age: '0d' }];
      const downsampleSteps = [
        { after: '10d', fixed_interval: '1h' },
        { after: '30d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      expect(result.timelineSegments).toHaveLength(3);
      expect(result.timelineSegments.every((s) => !s.isDelete)).toBe(true);
    });

    it('should not duplicate 0d when first downsample step starts at 0d', () => {
      const phases: SegmentPhase[] = [
        { grow: true, min_age: '0d' },
        { grow: false, min_age: '60d', isDelete: true },
      ];
      const downsampleSteps = [
        { after: '0d', fixed_interval: '1h' },
        { after: '30d', fixed_interval: '1d' },
      ];

      const result = buildDslSegments(phases, downsampleSteps);

      const zeroLabels = result.timelineSegments.filter((s) => s.leftValue === '0d');
      expect(zeroLabels).toHaveLength(1);
    });
  });

  describe('getGridTemplateColumns', () => {
    it('should generate grid template with fr units', () => {
      const segments: TimelineSegment[] = [
        { grow: 5, leftValue: '0d' },
        { grow: 3, leftValue: '30d' },
      ];

      const template = getGridTemplateColumns(segments);

      expect(template).toBe('5fr 3fr');
    });

    it('should use fixed width for delete phase', () => {
      const segments: TimelineSegment[] = [
        { grow: 5, leftValue: '0d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const template = getGridTemplateColumns(segments);

      expect(template).toBe('5fr 50px');
    });

    it('should default to 1fr for falsy grow values', () => {
      const segments = [
        { grow: 0, leftValue: '0d' },
        { grow: undefined as unknown as number, leftValue: '30d' },
      ];

      const template = getGridTemplateColumns(segments as TimelineSegment[]);

      expect(template).toBe('1fr 1fr');
    });
  });

  describe('getPhaseColumnSpans', () => {
    it('should return all 1s when phases and segments have same length', () => {
      const phases: SegmentPhase[] = [{ grow: 5 }, { grow: 3 }];
      const segments: TimelineSegment[] = [
        { grow: 5, leftValue: '0d' },
        { grow: 3, leftValue: '30d' },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      expect(spans).toEqual([1, 1]);
    });

    it('should span the single non-delete phase across multiple segments', () => {
      const phases: SegmentPhase[] = [{ grow: true }, { grow: false, isDelete: true }];
      const segments: TimelineSegment[] = [
        { grow: 3, leftValue: '0d' },
        { grow: 3, leftValue: '10d' },
        { grow: 3, leftValue: '20d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      expect(spans).toEqual([3, 1]);
    });

    it('spans each phase by the columns inside its time range (frozen after the steps)', () => {
      // hot (0d) + frozen (20d) + delete with 2 downsample steps => 3 non-delete columns + 1 delete.
      const phases: SegmentPhase[] = [
        { grow: true, label: 'hot', min_age: '0d' },
        { grow: true, label: 'frozen', min_age: '20d' },
        { grow: false, isDelete: true, min_age: '30d' },
      ];
      const segments: TimelineSegment[] = [
        { grow: 3, leftValue: '0d' },
        { grow: 3, leftValue: '10d' },
        { grow: 3, leftValue: '20d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      // hot covers 0d + 10d (span 2), frozen covers 20d (span 1), delete spans 1.
      expect(spans).toEqual([2, 1, 1]);
      expect(spans.reduce((a, b) => a + b, 0)).toBe(segments.length);
    });

    it('spans each phase by its time range when frozen starts before the first step', () => {
      // frozen (10s) starts before the downsample steps (1d, 2d, 4d), so hot only covers 0s and
      // frozen absorbs the step columns instead of being squeezed to a single column.
      const phases: SegmentPhase[] = [
        { grow: true, label: 'hot', min_age: '0s' },
        { grow: true, label: 'frozen', min_age: '10s' },
        { grow: false, isDelete: true, min_age: '30d' },
      ];
      const segments: TimelineSegment[] = [
        { grow: 1, leftValue: '0s' },
        { grow: 5, leftValue: '10s' },
        { grow: 6, leftValue: '1d' },
        { grow: 7, leftValue: '2d' },
        { grow: 8, leftValue: '4d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      // hot covers 0s only (span 1), frozen covers 10s/1d/2d/4d (span 4), delete spans 1.
      expect(spans).toEqual([1, 4, 1]);
      expect(spans.reduce((a, b) => a + b, 0)).toBe(segments.length);
    });

    it('keeps spans within the grid when frozen_after is 0d (zero-duration hot phase)', () => {
      // frozen_after=0d: two 0d columns (hot start + frozen), then the downsample columns. Hot spans
      // [0d, 0d) (zero duration) so it counts 0 raw columns; it must still get one column, borrowed
      // from frozen, so the total never exceeds the grid tracks and the delete bar doesn't wrap.
      const phases: SegmentPhase[] = [
        { grow: true, label: 'hot', min_age: '0d' },
        { grow: true, label: 'frozen', min_age: '0d' },
        { grow: false, isDelete: true, min_age: '30d' },
      ];
      const segments: TimelineSegment[] = [
        { grow: 2, leftValue: '0d' },
        { grow: 2, leftValue: '0d' },
        { grow: 5, leftValue: '1d' },
        { grow: 6, leftValue: '2d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      // hot borrows one column (span 1), frozen keeps the rest (span 3), delete spans 1 — total 5.
      expect(spans).toEqual([1, 3, 1]);
      expect(spans.reduce((a, b) => a + b, 0)).toBe(segments.length);
    });

    it('places an invalid (negative) frozen column right after hot without wrapping', () => {
      // frozen_after=-1d: its column keeps the '-1d' label but its position clamps to 0d, so it maps
      // into the frozen phase span (right after hot) and the delete bar does not wrap.
      const phases: SegmentPhase[] = [
        { grow: true, label: 'hot', min_age: '0d' },
        { grow: true, label: 'frozen', min_age: '-1d', isFrozen: true },
        { grow: false, isDelete: true, min_age: '30d' },
      ];
      const segments: TimelineSegment[] = [
        { grow: 2, leftValue: '0d' },
        { grow: 2, leftValue: '-1d', isFrozen: true },
        { grow: 5, leftValue: '1d' },
        { grow: 6, leftValue: '2d' },
        { grow: false, leftValue: '30d', isDelete: true },
      ];

      const spans = getPhaseColumnSpans(phases, segments);

      expect(spans).toEqual([1, 3, 1]);
      expect(spans.reduce((a, b) => a + b, 0)).toBe(segments.length);
    });
  });

  describe('buildDownsamplingSegments', () => {
    it('should return dslSegments downsampling when provided', () => {
      const phases: SegmentPhase[] = [{ grow: true }];
      const dslSegments = {
        timelineSegments: [] as TimelineSegment[],
        downsamplingSegments: [{ grow: 5 as const, step: { after: '0d', fixed_interval: '1h' } }],
      };

      const result = buildDownsamplingSegments(phases, dslSegments);

      expect(result).toBe(dslSegments.downsamplingSegments);
    });

    it('should return segments even when no downsampling (empty state)', () => {
      const phases: SegmentPhase[] = [{ grow: true }, { grow: false, isDelete: true }];

      const result = buildDownsamplingSegments(phases, null);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ grow: true });
      expect(result[1]).toMatchObject({ grow: false, isDelete: true });
    });

    it('should build ILM downsampling segments with correct step indices', () => {
      const phases: SegmentPhase[] = [
        { grow: 5, label: 'hot', downsample: { after: '0ms', fixed_interval: '1h' } },
        { grow: 3, label: 'warm' },
        { grow: 2, label: 'cold', downsample: { after: '30d', fixed_interval: '1d' } },
        { grow: false, isDelete: true },
      ];

      const result = buildDownsamplingSegments(phases, null);

      expect(result).toHaveLength(4);
      expect(result[0].stepIndex).toBe(0);
      expect(result[0].phaseName).toBe('hot');
      expect(result[1].stepIndex).toBeUndefined();
      expect(result[1].phaseName).toBeUndefined();
      expect(result[2].stepIndex).toBe(1);
      expect(result[2].phaseName).toBe('cold');
      expect(result[3].isDelete).toBe(true);
    });
  });
});
