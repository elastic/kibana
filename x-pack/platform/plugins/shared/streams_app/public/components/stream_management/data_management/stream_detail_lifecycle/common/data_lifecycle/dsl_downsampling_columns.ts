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
  type TimelineSegment,
} from './data_lifecycle_segments';

const DELETE_COLUMN_WIDTH = '50px';

export interface DslDownsamplingColumnsModel {
  gridTemplateColumns: string;
  columnStarts: number[];
  timelineSegments: TimelineSegment[];
}

const isFrozenPhase = (phase: LifecyclePhase) => Boolean(phase.isFrozen) || phase.name === 'frozen';

/**
 * Sub-grid for the DSL downsampling/timeline rows, aligned to the canonical phase bar: step tracks are
 * scaled to sum to the canonical hot grow (frozen grow and delete width are reused as-is).
 *
 * Returns `null` when it can't fit (frozen not the last non-delete boundary, or a step hidden by
 * retention), so the caller uses the dynamic shared layout.
 */
export const buildDslDownsamplingColumns = (
  phases: LifecyclePhase[],
  downsampleSteps: DownsampleStep[]
): DslDownsamplingColumnsModel | null => {
  const { timelineSegments, downsamplingSegments } = buildDslSegments(phases, downsampleSteps);

  const frozenSegmentCount = timelineSegments.filter((segment) => segment.isFrozen).length;
  const deleteSegmentCount = timelineSegments.filter((segment) => segment.isDelete).length;
  if (frozenSegmentCount > 1 || deleteSegmentCount > 1) {
    return null;
  }

  const hasFrozenPhase = phases.some(isFrozenPhase);
  if (hasFrozenPhase && frozenSegmentCount !== 1) {
    return null;
  }

  // Frozen's track sits right before delete, so its boundary must be the last non-delete one.
  const nonDeleteSegments = timelineSegments.filter((segment) => !segment.isDelete);
  const frozenIndexInNonDelete = nonDeleteSegments.findIndex((segment) => segment.isFrozen);
  if (frozenIndexInNonDelete !== -1 && frozenIndexInNonDelete !== nonDeleteSegments.length - 1) {
    return null;
  }

  // A step hidden by retention would break the track/step count match.
  const representedSteps = downsamplingSegments.filter((segment) => Boolean(segment.step)).length;
  if (representedSteps !== downsampleSteps.length) {
    return null;
  }

  const phaseSegments = buildPhaseTimelineSegments(phases);
  const hotPhaseIndex = phases.findIndex((phase) => !phase.isDelete && !isFrozenPhase(phase));
  const frozenPhaseIndex = phases.findIndex(isFrozenPhase);
  const hotGrow = hotPhaseIndex >= 0 ? Number(phaseSegments[hotPhaseIndex].grow) || 1 : 1;
  const frozenGrow = frozenPhaseIndex >= 0 ? Number(phaseSegments[frozenPhaseIndex].grow) || 1 : 0;

  const hotRegionIndices = timelineSegments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => !segment.isFrozen && !segment.isDelete)
    .map(({ index }) => index);
  const rawHotGrows = hotRegionIndices.map((index) => Number(timelineSegments[index].grow) || 1);
  const rawHotSum = rawHotGrows.reduce((sum, grow) => sum + grow, 0) || 1;
  // Keep relative step widths, scaled to fill the canonical hot track.
  const scaledHotFrs = rawHotGrows.map((grow) => (grow / rawHotSum) * hotGrow);

  const hotRegionCount = hotRegionIndices.length;
  const frozenColumnStart = hotRegionCount + 1;
  const deleteColumnStart = hotRegionCount + 2;

  let hotCursor = 0;
  const columnStarts = timelineSegments.map((segment) => {
    if (segment.isDelete) return deleteColumnStart;
    if (segment.isFrozen) return frozenColumnStart;
    hotCursor += 1;
    return hotCursor;
  });

  const roundFr = (value: number) => Math.round(value * 1000) / 1000;
  const gridTemplateColumns = [
    ...scaledHotFrs.map((fr) => `${roundFr(fr)}fr`),
    frozenSegmentCount === 1 ? `${frozenGrow}fr` : '0fr',
    deleteSegmentCount === 1 ? DELETE_COLUMN_WIDTH : '0px',
  ].join(' ');

  const timelineSegmentsWithColumns = timelineSegments.map((segment, index) => ({
    ...segment,
    columnStart: columnStarts[index],
  }));

  return {
    gridTemplateColumns,
    columnStarts,
    timelineSegments: timelineSegmentsWithColumns,
  };
};
