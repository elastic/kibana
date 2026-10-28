/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingNodeRef } from '../../../services/unit_graph';
import type {
  ProcessorInstanceStatsView,
  ProcessorStatsView,
} from '../../../services/unit_stats_client/types';
import { findSlotInstance } from './find_slot_instance';
import type { StatsEntry } from './types';

export interface SlotStats {
  /**
   * `unknown` when there is nothing to show yet: no processors, a result still to arrive, or a
   * failure. Once every processor has a result it is `ready`, and a missing value is `null`.
   */
  status: 'unknown' | 'ready';
  /** Records per second that reach the slot. Nothing is known about what leaves it. */
  eventsRate: number | null;
  /** Seconds that a record spends in the slot, on average. */
  durationAverage: number | null;
}

const UNKNOWN: SlotStats = { status: 'unknown', eventsRate: null, durationAverage: null };

const isNumber = (value: number | null): value is number => value !== null;

/**
 * The numbers of a processing node, from the entries of its processors in the order they run. The
 * processors of a slot run one after another, which this rule assumes.
 *
 * - The rate is the first processor's: everything that enters the slot passes through it.
 * - The time is the sum of the processors' averages, and `null` when any is missing. A processor
 *   that drops records makes the later averages apply to fewer records, so the sum is approximate.
 */
export const getSlotStats = (
  ref: ProcessingNodeRef,
  entries: ReadonlyArray<StatsEntry<ProcessorStatsView> | undefined>
): SlotStats => {
  if (entries.length === 0) return UNKNOWN;

  const instances: Array<ProcessorInstanceStatsView | undefined> = [];
  for (const entry of entries) {
    if (!entry?.stats || entry.status === 'loading' || entry.status === 'error') return UNKNOWN;
    instances.push(findSlotInstance(entry.stats, ref));
  }

  const durations = instances.map((instance) => instance?.durationAverage ?? null);

  return {
    status: 'ready',
    eventsRate: instances[0]?.eventsRate ?? null,
    durationAverage: durations.every(isNumber)
      ? durations.reduce((total, duration) => total + duration, 0)
      : null,
  };
};
