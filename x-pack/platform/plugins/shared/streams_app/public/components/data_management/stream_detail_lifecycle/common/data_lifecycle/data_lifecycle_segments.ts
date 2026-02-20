/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { splitSizeAndUnits, toMillis } from '../../helpers/format_size_units';

interface BaseLifecycleSegment {
  grow: EuiFlexItemProps['grow'];
  isDelete?: boolean;
}

export interface TimelineSegment extends BaseLifecycleSegment {
  leftValue?: string;
}

export interface DownsamplingSegment extends BaseLifecycleSegment {
  step?: DownsampleStep;
  stepIndex?: number;
  phaseName?: string;
}

export interface SegmentPhase extends BaseLifecycleSegment {
  min_age?: string;
  downsample?: DownsampleStep;
  label?: string;
}

type GrowValue = Exclude<EuiFlexItemProps['grow'], boolean | null | undefined>;

function assertGrowValue(value: number): asserts value is GrowValue {
  if (value < 0 || value > 10 || !Number.isInteger(value)) {
    throw new Error(`Invalid GrowValue: ${value}`);
  }
}

const toGrowValue = (value: number): GrowValue => {
  const clamped = Math.min(10, Math.max(1, Math.round(value)));
  assertGrowValue(clamped);
  return clamped;
};

const normalizeToGrowValue = (value: number, maxValue: number): GrowValue => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return toGrowValue((value / maxValue) * 10);
};

const getZeroLabel = (reference?: string): string => {
  if (!reference) return '0d';
  const { unit } = splitSizeAndUnits(reference);
  return unit ? `0${unit}` : '0d';
};

const filterStepStartsBeforeRetention = (
  stepStarts: string[],
  retentionMs: number | undefined
): string[] => {
  if (retentionMs === undefined) return stepStarts;
  return stepStarts.filter((value) => {
    const startMs = toMillis(value);
    return startMs === undefined || startMs < retentionMs;
  });
};

const partitionPhases = (phases: SegmentPhase[]) => {
  const deletePhase = phases.find((phase) => phase.isDelete);
  const nonDeletePhases = phases.filter((phase) => !phase.isDelete);
  return { deletePhase, nonDeletePhases };
};

const calculateGrowValues = (
  boundaries: string[],
  segmentCount: number,
  hasRetention: boolean
): GrowValue[] => {
  const boundaryMs = boundaries.map(toMillis);

  const durations = Array.from({ length: segmentCount }, (_, index) => {
    const startMs = boundaryMs[index];
    const endMs = boundaryMs[index + 1];
    return startMs !== undefined && endMs !== undefined && endMs > startMs ? endMs - startMs : 1;
  });

  // For indefinite retention, make the last segment slightly bigger than the largest one
  if (!hasRetention && durations.length > 1) {
    const previousDurations = durations.slice(0, -1);
    const maxPreviousDuration = Math.max(...previousDurations);
    durations[durations.length - 1] = maxPreviousDuration * 1.2;
  }

  const maxDuration = Math.max(...durations, 1);
  return durations.map((duration) => normalizeToGrowValue(duration, maxDuration));
};

export const buildPhaseTimelineSegments = (phases: SegmentPhase[]): TimelineSegment[] => {
  const nonDeletePhases = phases.filter((phase) => !phase.isDelete);
  const secondMinAge = nonDeletePhases.length > 1 ? nonDeletePhases[1]?.min_age : undefined;

  return phases.map((phase, index) => {
    const isFirst = index === 0;
    const leftValue = isFirst && secondMinAge ? getZeroLabel(secondMinAge) : phase.min_age;

    return {
      grow: phase.grow,
      leftValue,
      isDelete: phase.isDelete,
    };
  });
};

export const buildDslSegments = (
  phases: SegmentPhase[],
  downsampleSteps: DownsampleStep[]
): { timelineSegments: TimelineSegment[]; downsamplingSegments: DownsamplingSegment[] } => {
  const { deletePhase, nonDeletePhases } = partitionPhases(phases);
  const basePhase = nonDeletePhases[0];
  const retentionLabel = deletePhase?.min_age;
  const retentionMs = toMillis(retentionLabel);

  // Get downsample step start times, filtering out those after retention
  const stepStarts = filterStepStartsBeforeRetention(
    downsampleSteps.map((step) => step.after),
    retentionMs
  );

  // Build time boundaries: [start, ...stepStarts, retention?]
  const startLabel = basePhase?.min_age ?? getZeroLabel(retentionLabel ?? stepStarts[0]);
  // Filter out step starts that equal the start label to avoid duplicates
  const filteredStepStarts = stepStarts.filter((step) => step !== startLabel);
  const boundaries = [
    startLabel,
    ...filteredStepStarts,
    ...(retentionLabel ? [retentionLabel] : []),
  ];
  const segmentCount = retentionLabel ? boundaries.length - 1 : boundaries.length;

  // Calculate proportional grow values based on durations
  const growValues = calculateGrowValues(boundaries, segmentCount, Boolean(retentionLabel));

  // Map step starts to their indices
  const stepStartToIndex = new Map(stepStarts.map((value, index) => [value, index]));

  // Build timeline segments
  const timelineSegments: TimelineSegment[] = growValues.map((grow, index) => ({
    grow,
    leftValue: boundaries[index],
  }));

  // Build downsampling segments
  const downsamplingSegments: DownsamplingSegment[] = growValues.map((grow, index) => {
    const boundaryLabel = boundaries[index];
    const stepIndex = stepStartToIndex.get(boundaryLabel);
    return {
      grow,
      stepIndex,
      step: stepIndex !== undefined ? downsampleSteps[stepIndex] : undefined,
    };
  });

  // Add delete phase if present
  if (deletePhase) {
    timelineSegments.push({
      grow: deletePhase.grow,
      leftValue: deletePhase.min_age,
      isDelete: true,
    });
    downsamplingSegments.push({
      grow: deletePhase.grow,
      isDelete: true,
    });
  }

  return { timelineSegments, downsamplingSegments };
};

export const buildIlmDownsamplingSegments = (
  phases: SegmentPhase[]
): DownsamplingSegment[] | null => {
  const { deletePhase, nonDeletePhases } = partitionPhases(phases);

  // Find which phases have downsampling
  const phasesWithDownsample = nonDeletePhases
    .map((phase, index) => ({ phase, index }))
    .filter(({ phase }) => phase.downsample);

  if (phasesWithDownsample.length === 0) {
    return null;
  }

  const lastDownsampleIndex = phasesWithDownsample[phasesWithDownsample.length - 1].index;

  // Calculate combined grow for the last downsampling phase (spans remaining phases)
  const lastPhaseGrow = nonDeletePhases
    .slice(lastDownsampleIndex)
    .reduce((sum, p) => sum + (Number(p.grow) || 0), 0);

  const segments: DownsamplingSegment[] = nonDeletePhases
    .slice(0, lastDownsampleIndex + 1)
    .map((phase, index) => {
      const downsampleEntry = phasesWithDownsample.find((entry) => entry.index === index);
      const isLastDownsample = index === lastDownsampleIndex;

      return {
        grow: toGrowValue(isLastDownsample ? lastPhaseGrow || 1 : Number(phase.grow) || 1),
        step: downsampleEntry?.phase.downsample,
        stepIndex: downsampleEntry ? phasesWithDownsample.indexOf(downsampleEntry) : undefined,
      };
    });

  // Add delete phase segment if present
  if (deletePhase) {
    segments.push({
      grow: deletePhase.grow,
      isDelete: true,
    });
  }

  return segments;
};

const DELETE_COLUMN_WIDTH = '50px';

export const getGridTemplateColumns = (segments: TimelineSegment[]) =>
  segments
    .map((segment) => (segment.isDelete ? DELETE_COLUMN_WIDTH : `${Number(segment.grow) || 1}fr`))
    .join(' ');

export const getPhaseColumnSpans = (phases: SegmentPhase[], segments: TimelineSegment[]) => {
  if (phases.length === segments.length) {
    return phases.map(() => 1);
  }

  const nonDeleteCount = Math.max(segments.filter((segment) => !segment.isDelete).length, 1);
  return phases.map((phase) => (phase.isDelete ? 1 : nonDeleteCount));
};

export const buildDownsamplingSegments = (
  phases: SegmentPhase[],
  dslSegments: ReturnType<typeof buildDslSegments> | null
): DownsamplingSegment[] | null => {
  if (dslSegments) {
    return dslSegments.downsamplingSegments;
  }

  const hasIlmDownsampling = phases.some((phase) => phase.downsample);
  if (!hasIlmDownsampling) {
    return null;
  }

  // Track the downsample step index separately from phase index
  let downsampleStepIndex = 0;
  return phases.map((phase) => {
    const segment: DownsamplingSegment = {
      grow: phase.grow,
      step: phase.downsample,
      stepIndex: phase.downsample ? downsampleStepIndex : undefined,
      isDelete: phase.isDelete,
      phaseName: phase.downsample ? phase.label : undefined,
    };
    if (phase.downsample) {
      downsampleStepIndex++;
    }
    return segment;
  });
};
