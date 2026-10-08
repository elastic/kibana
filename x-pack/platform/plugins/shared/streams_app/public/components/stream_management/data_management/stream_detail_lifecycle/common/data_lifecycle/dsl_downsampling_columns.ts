/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import type { LifecyclePhase } from './lifecycle_types';
import {
  buildDslSegments,
  buildPhaseTimelineSegments,
  positionMs,
  DELETE_COLUMN_WIDTH,
  type TimelineSegment,
} from './data_lifecycle_segments';

export interface DslDownsamplingColumnsModel {
  gridTemplateColumns: string;
  columnStarts: number[];
  timelineSegments: TimelineSegment[];
}

const isFrozenPhase = (phase: LifecyclePhase) => Boolean(phase.isFrozen) || phase.name === 'frozen';

interface RegionPoint {
  ms: number;
  leftValue?: string;
  stepIndex?: number;
  isFrozen?: boolean;
  rawIndex?: number;
}

/**
 * Sub-grid (one column per region between `0d`/steps/frozen, plus delete) for the downsampling and
 * timeline rows. Frozen always keeps its own boundary — collapsing to `0fr` when it lands on a step —
 * so the column count stays constant and CSS can tween `grid-template-columns` instead of snapping;
 * region widths scale to the canonical hot/frozen grows. Returns `null` when it can't map.
 */
export const buildDslDownsamplingColumns = (
  phases: LifecyclePhase[],
  downsampleSteps: DownsampleStep[]
): DslDownsamplingColumnsModel | null => {
  const { timelineSegments: rawTimeline, downsamplingSegments } = buildDslSegments(
    phases,
    downsampleSteps
  );

  const deleteSegmentCount = downsamplingSegments.filter((segment) => segment.isDelete).length;
  if (deleteSegmentCount > 1) {
    return null;
  }

  // A step hidden by retention would break the fixed region/step count match.
  const representedSteps = downsamplingSegments.filter((segment) => Boolean(segment.step)).length;
  if (representedSteps !== downsampleSteps.length) {
    return null;
  }

  const hasFrozenPhase = phases.some(isFrozenPhase);
  const phaseSegments = buildPhaseTimelineSegments(phases);
  const hotPhaseIndex = phases.findIndex((phase) => !phase.isDelete && !isFrozenPhase(phase));
  const frozenPhaseIndex = phases.findIndex(isFrozenPhase);
  const hotGrow = hotPhaseIndex >= 0 ? Number(phaseSegments[hotPhaseIndex].grow) || 1 : 1;
  const frozenGrow = frozenPhaseIndex >= 0 ? Number(phaseSegments[frozenPhaseIndex].grow) || 1 : 0;

  const deletePhase = phases.find((phase) => phase.isDelete);
  const retentionLabel = deletePhase?.min_age;
  const retentionMs = positionMs(retentionLabel);
  const frozenAfterMs =
    frozenPhaseIndex >= 0 ? positionMs(phases[frozenPhaseIndex].min_age) : undefined;

  // Ordered region points from the DSL boundaries (delete is the trailing fixed-width track).
  const nonDeleteRaw = rawTimeline
    .map((segment, rawIndex) => ({ segment, rawIndex }))
    .filter(({ segment }) => !segment.isDelete);

  const points: RegionPoint[] = nonDeleteRaw.map(({ segment, rawIndex }) => ({
    ms: positionMs(segment.leftValue) ?? 0,
    leftValue: segment.leftValue,
    stepIndex: segment.stepIndex,
    isFrozen: segment.isFrozen,
    rawIndex,
  }));

  // At a coincident boundary the DSL dedup drops frozen; re-insert it *before* the step at that
  // instant so frozen takes the collapsed `0fr` marker region and the step keeps the real width to
  // the next boundary (otherwise the step region would be zero and the frozen one would steal it).
  if (hasFrozenPhase && frozenAfterMs !== undefined && !points.some((point) => point.isFrozen)) {
    const frozenLabel = phases[frozenPhaseIndex].min_age;
    let insertAt = points.findIndex((point) => point.ms >= frozenAfterMs);
    if (insertAt === -1) insertAt = points.length;
    points.splice(insertAt, 0, {
      ms: frozenAfterMs,
      leftValue: frozenLabel,
      isFrozen: true,
    });
  }

  // Region i spans `[points[i].ms, points[i+1].ms)`, the last running to retention.
  const durations = points.map((point, index) => {
    const endMs = index < points.length - 1 ? points[index + 1].ms : retentionMs;
    return endMs === undefined ? undefined : Math.max(0, endMs - point.ms);
  });
  if (durations[durations.length - 1] === undefined) {
    // Indefinite retention: make the trailing region a bit larger than the widest, so it stays visible.
    const finite = durations.filter((duration): duration is number => duration !== undefined);
    durations[durations.length - 1] = Math.max(...finite, 1) * 1.2;
  }

  // Weight per region: floor positive durations to `[2, 10]` (like the phase/segment grows) so a thin
  // region can't crowd its labels; keep 0 for zero-duration regions so they collapse to `0fr`.
  const maxDuration = Math.max(...durations.map((duration) => duration ?? 0), 1);
  const weights = durations.map((duration) =>
    !duration ? 0 : Math.min(10, Math.max(2, Math.round((duration / maxDuration) * 10)))
  );

  // Scale each phase group's weights to the canonical grow so the frozen boundary and delete edge
  // stay aligned with the phase bar, wherever the steps fall.
  const groupOf = (point: RegionPoint): 'hot' | 'frozen' =>
    frozenAfterMs !== undefined && point.ms >= frozenAfterMs ? 'frozen' : 'hot';

  const regionFrs = new Array<number>(points.length).fill(0);
  const fillGroup = (group: 'hot' | 'frozen', targetGrow: number) => {
    const indices = points.flatMap((point, index) => (groupOf(point) === group ? [index] : []));
    const sum = indices.reduce((total, index) => total + weights[index], 0);
    indices.forEach((index, position) => {
      // If the whole group is zero-weight, keep the target on its first region so it stays aligned.
      regionFrs[index] =
        sum > 0 ? (weights[index] / sum) * targetGrow : position === 0 ? targetGrow : 0;
    });
  };
  fillGroup('hot', hotGrow);
  if (hasFrozenPhase) fillGroup('frozen', frozenGrow);

  const roundFr = (value: number) => Math.round(value * 1000) / 1000;
  const gridTemplateColumns = [
    ...regionFrs.map((fr) => `${roundFr(fr)}fr`),
    // Keep a frozen slot even when the phase is absent, so adding/removing it doesn't change the count.
    ...(hasFrozenPhase ? [] : ['0fr']),
    deleteSegmentCount === 1 ? DELETE_COLUMN_WIDTH : '0px',
  ].join(' ');

  const frozenPlaceholderColumns = hasFrozenPhase ? 0 : 1;
  const deleteColumnStart = points.length + frozenPlaceholderColumns + 1;

  const columnStarts = rawTimeline.map((segment) => (segment.isDelete ? deleteColumnStart : 0));
  points.forEach((point, index) => {
    if (point.rawIndex !== undefined) {
      columnStarts[point.rawIndex] = index + 1;
    }
  });

  const timelineSegments: TimelineSegment[] = points.map((point, index) => ({
    grow: 1,
    leftValue: point.leftValue,
    stepIndex: point.stepIndex,
    isFrozen: point.isFrozen,
    columnStart: index + 1,
  }));
  if (deletePhase) {
    timelineSegments.push({
      grow: 1,
      leftValue: retentionLabel,
      isDelete: true,
      columnStart: deleteColumnStart,
    });
  }

  return {
    gridTemplateColumns,
    columnStarts,
    timelineSegments,
  };
};
