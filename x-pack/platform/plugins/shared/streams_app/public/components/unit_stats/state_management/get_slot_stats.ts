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

interface SlotNumbers {
  /** Records per second that reach the slot. Nothing is known about what leaves it. */
  eventsRate: number | null;
  /** Seconds that a record spends in the slot, on average. */
  durationAverage: number | null;
}

/**
 * - `unknown`: there is nothing to show yet, because there are no processors or a result is still
 *   to arrive.
 * - `ready`: every processor has a result. A missing value is `null`.
 * - `stale`: the numbers are shown, but the last refresh of a processor failed.
 * - `error`: the stats of a processor could not be loaded, so there are no numbers. The reason is
 *   the one of the first processor that failed.
 */
export type SlotStats =
  | ({ status: 'unknown' | 'ready' | 'stale' } & SlotNumbers)
  | ({ status: 'error'; errorReason: string } & { eventsRate: null; durationAverage: null });

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

  const failed = entries.find((entry) => entry?.status === 'error');
  if (failed?.error) {
    return {
      status: 'error',
      eventsRate: null,
      durationAverage: null,
      errorReason: failed.error.reason,
    };
  }

  const instances: Array<ProcessorInstanceStatsView | undefined> = [];
  for (const entry of entries) {
    if (!entry?.stats || entry.status === 'loading' || entry.status === 'error') return UNKNOWN;
    instances.push(findSlotInstance(entry.stats, ref));
  }

  const durations = instances.map((instance) => instance?.durationAverage ?? null);

  return {
    status: entries.some((entry) => entry?.status === 'stale') ? 'stale' : 'ready',
    eventsRate: instances[0]?.eventsRate ?? null,
    durationAverage: durations.every(isNumber)
      ? durations.reduce((total, duration) => total + duration, 0)
      : null,
  };
};
