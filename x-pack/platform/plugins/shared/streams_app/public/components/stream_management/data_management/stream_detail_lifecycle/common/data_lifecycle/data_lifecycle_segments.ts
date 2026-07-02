/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlexItemProps } from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { splitSizeAndUnits, toMillis } from '../../../../../../util/format_size_units';

interface BaseLifecycleSegment {
  grow: EuiFlexItemProps['grow'];
  isDelete?: boolean;
  // Marks the frozen phase so the timeline can flag it (e.g. red for an invalid frozen_after) by
  // identity rather than by matching its `min_age`, which may be invalid/clamped and coincide with 0d.
  isFrozen?: boolean;
}

export interface TimelineSegment extends BaseLifecycleSegment {
  leftValue?: string;
  stepIndex?: number;
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
  // Minimum of 2 matches ILM's floor so out-of-order / zero-duration phases never collapse to a
  // 1fr sliver that causes labels to crowd together (mirrors getIlmPhaseGrowValues in
  // ilm_policy_phases.ts which also clamps to [2, 10]).
  const clamped = Math.min(10, Math.max(2, Math.round(value)));
  assertGrowValue(clamped);
  return clamped;
};

const normalizeToGrowValue = (value: number, maxValue: number): GrowValue => {
  if (!Number.isFinite(value) || value <= 0) return 2;
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

const filterDownsampleStepsBeforeRetention = (
  downsampleSteps: DownsampleStep[],
  retentionMs: number | undefined
): Array<{ step: DownsampleStep; index: number }> => {
  if (retentionMs === undefined) {
    return downsampleSteps.map((step, index) => ({ step, index }));
  }

  return downsampleSteps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => {
      const startMs = toMillis(step.after);
      return startMs === undefined || startMs < retentionMs;
    });
};

interface DslBoundary {
  label: string;
  stepIndex?: number;
  isFrozen?: boolean;
}

const partitionPhases = (phases: SegmentPhase[]) => {
  const deletePhase = phases.find((phase) => phase.isDelete);
  const nonDeletePhases = phases.filter((phase) => !phase.isDelete);
  return { deletePhase, nonDeletePhases };
};

// An invalid/negative age (e.g. frozen_after=-1d) is positioned at the timeline start rather than
// dropped, so clamp negatives to 0 for all layout math while the raw label is still shown to the user.
const positionMs = (label?: string): number | undefined => {
  const ms = toMillis(label);
  return ms === undefined ? undefined : Math.max(ms, 0);
};

const calculateGrowValues = (
  boundaries: string[],
  segmentCount: number,
  hasRetention: boolean
): GrowValue[] => {
  const boundaryMs = boundaries.map(positionMs);

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

  // When phases carry an explicit numeric `grow` (e.g. ILM, where grow is precomputed) we preserve
  // it. The DSL path passes `grow: true` for every phase, which would otherwise render hot and
  // frozen at equal widths regardless of their `[0, frozen_after)` vs `[frozen_after, retention)`
  // durations. In that case we size the non-delete phases proportionally to their durations, reusing
  // the same boundary-based logic as `buildDslSegments`.
  const hasExplicitGrow = nonDeletePhases.some((phase) => typeof phase.grow === 'number');
  const proportionalGrow = !hasExplicitGrow && nonDeletePhases.length > 1;

  let nonDeleteGrowValues: GrowValue[] | undefined;
  if (proportionalGrow) {
    const deletePhase = phases.find((phase) => phase.isDelete);
    const retentionLabel = deletePhase?.min_age;
    // Boundaries are each non-delete phase's start (`min_age`), then the retention end if present.
    const boundaries = [
      ...nonDeletePhases.map((phase, index) =>
        index === 0 ? getZeroLabel(secondMinAge ?? phase.min_age) : phase.min_age ?? getZeroLabel()
      ),
      ...(retentionLabel ? [retentionLabel] : []),
    ];
    nonDeleteGrowValues = calculateGrowValues(
      boundaries,
      nonDeletePhases.length,
      Boolean(retentionLabel)
    );
  }

  let nonDeleteCursor = 0;
  return phases.map((phase, index) => {
    const isFirst = index === 0;
    const leftValue = isFirst && secondMinAge ? getZeroLabel(secondMinAge) : phase.min_age;

    let grow = phase.grow;
    if (!phase.isDelete && nonDeleteGrowValues) {
      grow = nonDeleteGrowValues[nonDeleteCursor];
      nonDeleteCursor += 1;
    }

    return {
      grow,
      leftValue,
      isDelete: phase.isDelete,
      isFrozen: phase.isFrozen,
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

  // Downsample steps are normally hidden once they fall after retention (they'd never run). But when
  // the config is out of order — delete/retention is before a later phase boundary (e.g. delete=1d
  // while frozen_after=20d) — it is invalid and the timeline shows everything so the user can see
  // and fix it; filtering steps by retention there would make steps beyond the frozen boundary (e.g.
  // a 24d step) vanish. So: skip step filtering entirely when out of order, and otherwise filter by
  // retention as usual (in-order configs).
  const phaseBoundaryMsValues = nonDeletePhases
    .slice(1)
    .map((phase) => (phase.min_age ? toMillis(phase.min_age) : undefined))
    .filter((ms): ms is number => ms !== undefined);
  const maxPhaseBoundaryMs = phaseBoundaryMsValues.length
    ? Math.max(...phaseBoundaryMsValues)
    : undefined;
  const isOutOfOrder = retentionMs !== undefined && retentionMs < (maxPhaseBoundaryMs ?? 0);
  const effectiveRetentionMs = isOutOfOrder ? undefined : retentionMs;

  // Get downsample step start times, filtering out those after the effective timeline end
  const stepStarts = filterStepStartsBeforeRetention(
    downsampleSteps.map((step) => step.after),
    effectiveRetentionMs
  );
  const stepsBeforeRetention = filterDownsampleStepsBeforeRetention(
    downsampleSteps,
    effectiveRetentionMs
  );

  // Build time boundaries: [start, ...stepStarts, retention?]
  const startLabel = basePhase?.min_age ?? getZeroLabel(retentionLabel ?? stepStarts[0]);
  const startStepIndex =
    stepsBeforeRetention.length > 0 && stepsBeforeRetention[0].step.after === startLabel
      ? stepsBeforeRetention[0].index
      : undefined;

  const stepBoundaries: DslBoundary[] = stepsBeforeRetention
    .filter(({ index }) => index !== startStepIndex)
    .map(({ step, index }) => ({ label: step.after, stepIndex: index }));

  // Boundaries introduced by later non-delete phases (e.g. frozen's `min_age`/`frozen_after`).
  // Without these, a phase like frozen would visually start at the last downsample step instead of
  // its configured age. They carry no `stepIndex` because no downsample step starts there.
  //
  // Each phase always emits its own boundary (keeping its raw label for display), tagged so the
  // timeline can flag it. Positioning is handled during insertion below via `positionMs`, which
  // clamps to the start, so:
  //   - frozen_after=0d → its own 0d mark right after hot (ILM / non-metrics parity), not attached
  //     to the nearest downsample step, and
  //   - an invalid/negative frozen_after (e.g. -1d) → shown right after hot too (marked red via
  //     `isFrozen`) instead of disappearing.
  // Not filtered by retention so out-of-order phases (frozen > delete) also stay visible. A genuine
  // duplicate against a downsample step at the same instant is still deduped during insertion below.
  const phaseBoundaries: DslBoundary[] = nonDeletePhases.slice(1).flatMap((phase) => {
    if (!phase.min_age) return [];
    return [{ label: phase.min_age, isFrozen: phase.isFrozen }];
  });

  // Insert phase boundaries into the step boundaries without reordering the steps themselves
  // (step order is preserved intentionally — see the array-order test). Each phase boundary is
  // placed before the first step boundary that starts later in time, and skipped if a boundary at
  // the same instant already exists (a step boundary at that time keeps its `stepIndex`).
  //
  // Comparison is by parsed milliseconds, not by raw label, so a phase and a step that resolve to
  // the same instant in different units (e.g. frozen `120s` vs downsample `2m`) are treated as the
  // same boundary. Each label is parsed once into a `{ boundary, ms }` pair to avoid re-parsing on
  // every comparison.
  const innerBoundaries: Array<{ boundary: DslBoundary; ms: number }> = stepBoundaries.map(
    (boundary) => ({ boundary, ms: positionMs(boundary.label) ?? 0 })
  );
  for (const phaseBoundary of phaseBoundaries) {
    const phaseMs = positionMs(phaseBoundary.label) ?? 0;
    if (innerBoundaries.some((entry) => entry.ms === phaseMs)) {
      continue;
    }
    const insertAt = innerBoundaries.findIndex((entry) => entry.ms > phaseMs);
    const entry = { boundary: phaseBoundary, ms: phaseMs };
    if (insertAt === -1) {
      innerBoundaries.push(entry);
    } else {
      innerBoundaries.splice(insertAt, 0, entry);
    }
  }

  const boundaries: DslBoundary[] = [
    { label: startLabel, stepIndex: startStepIndex },
    ...innerBoundaries.map((entry) => entry.boundary),
    ...(retentionLabel ? [{ label: retentionLabel }] : []),
  ];
  const segmentCount = retentionLabel ? boundaries.length - 1 : boundaries.length;

  // Calculate proportional grow values based on durations
  const growValues = calculateGrowValues(
    boundaries.map((b) => b.label),
    segmentCount,
    Boolean(retentionLabel)
  );

  // Build timeline segments
  const timelineSegments: TimelineSegment[] = growValues.map((grow, index) => {
    const leftValue = boundaries[index].label;
    const stepIndex = boundaries[index].stepIndex;
    return {
      grow,
      leftValue,
      stepIndex,
      isFrozen: boundaries[index].isFrozen,
    };
  });

  // Build downsampling segments
  const downsamplingSegments: DownsamplingSegment[] = growValues.map((grow, index) => {
    const stepIndex = boundaries[index].stepIndex;
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

  // The timeline has more (non-delete) columns than phases because DSL downsample boundaries add
  // extra columns. Each non-delete phase should span exactly the columns that fall inside its time
  // range `[phase.min_age, nextNonDeletePhase.min_age)`, so a phase like frozen lines up with its
  // configured age regardless of whether it starts before or after the downsample steps. Counting
  // columns per phase (instead of dumping all extras onto the first phase) keeps the spans aligned
  // with the boundaries and prevents bars from shifting or overlapping.
  const nonDeletePhases = phases.filter((phase) => !phase.isDelete);
  const nonDeleteSegments = segments.filter((segment) => !segment.isDelete);
  const nonDeleteColumns = Math.max(nonDeleteSegments.length, 1);

  // `positionMs` clamps invalid/negative ages to the start, so an invalid frozen phase (and its
  // column) is placed right after hot rather than being pushed off the timeline.
  const phaseStartMs = nonDeletePhases.map((phase) => positionMs(phase.min_age) ?? 0);
  // Count how many non-delete columns start within each phase's time range.
  const spanByNonDeleteIndex = nonDeletePhases.map((_, phaseIndex) => {
    const startMs = phaseStartMs[phaseIndex];
    const nextStartMs = phaseStartMs[phaseIndex + 1];
    return nonDeleteSegments.filter((segment) => {
      const columnMs = positionMs(segment.leftValue) ?? 0;
      const afterStart = columnMs >= startMs;
      const beforeNext = nextStartMs === undefined || columnMs < nextStartMs;
      return afterStart && beforeNext;
    }).length;
  });

  // Every phase must occupy at least one grid column so its bar renders, but the spans must still
  // sum to exactly `nonDeleteColumns` or a bar wraps to a second row. A zero-duration phase (e.g.
  // hot when frozen_after is 0d, so hot spans `[0d, 0d)`) counts 0 columns; bumping it to 1 without
  // compensating would over-allocate. Borrow the extra column(s) from the widest phase so the total
  // is preserved and everything stays on one line.
  const normalizedSpans = spanByNonDeleteIndex.map((span) => Math.max(span, 1));
  const widestSpanIndex = () =>
    normalizedSpans.reduce((best, span, idx) => (span > normalizedSpans[best] ? idx : best), 0);
  let overAllocated = normalizedSpans.reduce((sum, span) => sum + span, 0) - nonDeleteColumns;
  while (overAllocated > 0) {
    const donor = widestSpanIndex();
    if (normalizedSpans[donor] <= 1) break; // more phases than columns — unavoidable, leave as-is
    normalizedSpans[donor] -= 1;
    overAllocated -= 1;
  }
  // If we under-allocated (fewer phase columns than grid columns, e.g. rounding), give the slack to
  // the widest phase so the totals line up again.
  if (normalizedSpans.length > 0 && overAllocated < 0) {
    normalizedSpans[widestSpanIndex()] -= overAllocated;
  }

  let nonDeleteCursor = 0;
  return phases.map((phase) => {
    if (phase.isDelete) {
      return 1;
    }
    const span = normalizedSpans[nonDeleteCursor] ?? 1;
    nonDeleteCursor += 1;
    return span;
  });
};

export const buildDownsamplingSegments = (
  phases: SegmentPhase[],
  dslSegments: ReturnType<typeof buildDslSegments> | null
): DownsamplingSegment[] => {
  if (dslSegments) {
    return dslSegments.downsamplingSegments;
  }

  const hasIlmDownsampling = phases.some((phase) => phase.downsample);
  if (!hasIlmDownsampling) {
    // Still return segments so the UI can show an "empty" downsampling timeline.
    return phases.map((phase) => ({
      grow: phase.grow,
      isDelete: phase.isDelete,
    }));
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
