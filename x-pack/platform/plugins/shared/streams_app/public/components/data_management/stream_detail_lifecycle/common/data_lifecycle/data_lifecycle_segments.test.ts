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

    it('should span non-delete phases across multiple segments', () => {
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

    it('should return null when no downsampling', () => {
      const phases: SegmentPhase[] = [{ grow: true }, { grow: false, isDelete: true }];

      const result = buildDownsamplingSegments(phases, null);

      expect(result).toBeNull();
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
      expect(result![0].stepIndex).toBe(0);
      expect(result![0].phaseName).toBe('hot');
      expect(result![1].stepIndex).toBeUndefined();
      expect(result![1].phaseName).toBeUndefined();
      expect(result![2].stepIndex).toBe(1);
      expect(result![2].phaseName).toBe('cold');
      expect(result![3].isDelete).toBe(true);
    });
  });
});
