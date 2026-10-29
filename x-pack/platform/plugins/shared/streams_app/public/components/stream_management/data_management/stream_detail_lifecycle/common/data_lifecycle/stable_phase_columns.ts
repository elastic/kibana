/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PHASE_ORDER, type IlmPhase } from '@kbn/data-lifecycle-phases';
import type { LifecyclePhase } from './lifecycle_types';
import {
  buildPhaseTimelineSegments,
  DELETE_COLUMN_WIDTH,
  type TimelineSegment,
} from './data_lifecycle_segments';

// `grid-template-columns` only animates between values with the same track count. Rendering every
// canonical `PHASE_ORDER` slot (absent phases as zero-width tracks) keeps that count fixed, so widths
// animate instead of snapping on add/remove.

// The DSL base phase uses a localized label rather than an ILM name, so it falls through to `hot`.
const slotOfPhase = (phase: LifecyclePhase): IlmPhase => {
  if (phase.isDelete) return 'delete';
  if (phase.isFrozen || phase.name === 'frozen') return 'frozen';
  const name = phase.name?.toLowerCase();
  if (name === 'warm') return 'warm';
  if (name === 'cold') return 'cold';
  return 'hot';
};

export interface StablePhaseSlot {
  slot: IlmPhase;
  phase: LifecyclePhase | null;
  phaseIndex: number | null;
  columnStart: number;
}

export interface StablePhaseColumnsModel {
  slots: StablePhaseSlot[];
  gridTemplateColumns: string;
  timelineSegments: TimelineSegment[];
  phaseColumnStarts: number[];
}

export const buildStablePhaseColumns = (phases: LifecyclePhase[]): StablePhaseColumnsModel => {
  const segments = buildPhaseTimelineSegments(phases);
  const slotIndexByPhase = phases.map((phase) => PHASE_ORDER.indexOf(slotOfPhase(phase)));

  const entryBySlotIndex = new Map<
    number,
    { phase: LifecyclePhase; phaseIndex: number; grow: number }
  >();
  phases.forEach((phase, index) => {
    entryBySlotIndex.set(slotIndexByPhase[index], {
      phase,
      phaseIndex: index,
      grow: Number(segments[index].grow) || 1,
    });
  });

  const gridTemplateColumns = PHASE_ORDER.map((slot, slotIndex) => {
    const entry = entryBySlotIndex.get(slotIndex);
    if (!entry) {
      return slot === 'delete' ? '0px' : '0fr';
    }
    return slot === 'delete' ? DELETE_COLUMN_WIDTH : `${entry.grow}fr`;
  }).join(' ');

  const slots: StablePhaseSlot[] = PHASE_ORDER.map((slot, slotIndex) => {
    const entry = entryBySlotIndex.get(slotIndex);
    return {
      slot,
      phase: entry?.phase ?? null,
      phaseIndex: entry?.phaseIndex ?? null,
      columnStart: slotIndex + 1,
    };
  });

  const phaseColumnStarts = slotIndexByPhase.map((slotIndex) => slotIndex + 1);

  const timelineSegments = segments.map((segment, index) => ({
    ...segment,
    columnStart: phaseColumnStarts[index],
  }));

  return { slots, gridTemplateColumns, timelineSegments, phaseColumnStarts };
};
