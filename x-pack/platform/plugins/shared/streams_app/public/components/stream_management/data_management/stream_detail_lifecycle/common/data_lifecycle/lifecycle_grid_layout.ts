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
  buildDownsamplingSegments,
  getGridTemplateColumns,
  getPhaseColumnSpans,
  type DownsamplingSegment,
  type TimelineSegment,
} from './data_lifecycle_segments';
import { buildStablePhaseColumns, type StablePhaseSlot } from './stable_phase_columns';
import { buildDslDownsamplingColumns } from './dsl_downsampling_columns';

export interface LifecycleGridLayout {
  phaseGridTemplateColumns: string;
  stableSlots?: StablePhaseSlot[];
  phaseColumnSpans: number[];
  stepsGridTemplateColumns: string;
  downsamplingColumnStarts?: number[];
  timelineSegments: TimelineSegment[];
  downsamplingSegments: DownsamplingSegment[] | null;
}

/**
 * Grid layout for the phase bar, downsampling and timeline rows. The phase bar uses the canonical
 * 5-slot layout (so widths interpolate on source/phase changes); DSL step rows use an aligned sub-grid,
 * falling back to a shared dynamic grid when they can't map onto it.
 */
export const resolveLifecycleGridLayout = (
  phases: LifecyclePhase[],
  downsampleSteps: DownsampleStep[] | undefined,
  showDownsampling: boolean
): LifecycleGridLayout => {
  const hasDslDownsampling = showDownsampling && Boolean(downsampleSteps?.length);
  const dslSegments =
    hasDslDownsampling && downsampleSteps ? buildDslSegments(phases, downsampleSteps) : null;
  const rawTimelineSegments = dslSegments?.timelineSegments ?? buildPhaseTimelineSegments(phases);
  const downsamplingSegments = showDownsampling
    ? buildDownsamplingSegments(phases, dslSegments)
    : null;

  const canonicalColumns = buildStablePhaseColumns(phases);
  const dslDownsamplingColumns =
    hasDslDownsampling && downsampleSteps
      ? buildDslDownsamplingColumns(phases, downsampleSteps)
      : null;

  const dynamicFallback = hasDslDownsampling && !dslDownsamplingColumns;
  const dynamicGridTemplateColumns = getGridTemplateColumns(rawTimelineSegments);

  return {
    phaseGridTemplateColumns: dynamicFallback
      ? dynamicGridTemplateColumns
      : canonicalColumns.gridTemplateColumns,
    stableSlots: dynamicFallback ? undefined : canonicalColumns.slots,
    phaseColumnSpans: dynamicFallback ? getPhaseColumnSpans(phases, rawTimelineSegments) : [],
    stepsGridTemplateColumns:
      dslDownsamplingColumns?.gridTemplateColumns ??
      (dynamicFallback ? dynamicGridTemplateColumns : canonicalColumns.gridTemplateColumns),
    downsamplingColumnStarts:
      dslDownsamplingColumns?.columnStarts ??
      (dynamicFallback ? undefined : canonicalColumns.phaseColumnStarts),
    timelineSegments:
      dslDownsamplingColumns?.timelineSegments ??
      (dynamicFallback ? rawTimelineSegments : canonicalColumns.timelineSegments),
    downsamplingSegments,
  };
};
