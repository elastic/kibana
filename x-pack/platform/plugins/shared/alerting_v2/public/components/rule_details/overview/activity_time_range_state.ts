/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { z } from '@kbn/zod';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { ALERTING_V2_RULES_APP_ID, ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import { DEFAULT_ACTIVITY_TIME_RANGE } from './time_range';

/** Namespace for the activity time range inside the `_a` app-state blob */
export const ACTIVITY_TIME_RANGE_APP_STATE_KEY = 'activityTimeRange' as const;

/** localStorage key for the last Alert activity time range on rule details */
export const ACTIVITY_TIME_RANGE_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.activityTimeRange` as const;

const APP_STATE_STORAGE_KEY = '_a';

type AppStateRecord = Record<string, unknown>;

const MAX_TIME_RANGE_STRING_LENGTH = 128;

const activityTimeRangeSchema = z.object({
  from: z.string().min(1).max(MAX_TIME_RANGE_STRING_LENGTH),
  to: z.string().min(1).max(MAX_TIME_RANGE_STRING_LENGTH),
});

export type AlertTimelineTimeRange = z.infer<typeof activityTimeRangeSchema>;

const isFiniteMs = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

/**
 * Validates a persisted activity range. Both bounds must parse as datemath and
 * start must not be after end; otherwise the source is ignored.
 */
export const decodeActivityTimeRange = (raw: unknown): AlertTimelineTimeRange | undefined => {
  const parsed = activityTimeRangeSchema.safeParse(raw);
  if (!parsed.success) {
    return undefined;
  }
  const { from, to } = parsed.data;
  const fromMs = datemath.parse(from)?.valueOf();
  const toMs = datemath.parse(to, { roundUp: true })?.valueOf();
  if (!isFiniteMs(fromMs) || !isFiniteMs(toMs) || fromMs > toMs) {
    return undefined;
  }
  return { from, to };
};

/**
 * Merges persisted ranges with URL winning over localStorage, and localStorage
 * winning over the default.
 */
export const resolveActivityTimeRange = (
  fromStorage?: AlertTimelineTimeRange | null,
  fromUrl?: AlertTimelineTimeRange | null,
  fallback: AlertTimelineTimeRange = DEFAULT_ACTIVITY_TIME_RANGE
): AlertTimelineTimeRange => fromUrl ?? fromStorage ?? fallback;

/** Value equality for two time ranges. */
export const isSameActivityTimeRange = (
  a: AlertTimelineTimeRange,
  b: AlertTimelineTimeRange
): boolean => a.from === b.from && a.to === b.to;

export const readActivityTimeRangeFromStorage = (
  storage: Storage
): AlertTimelineTimeRange | undefined =>
  decodeActivityTimeRange(storage.get(ACTIVITY_TIME_RANGE_STORAGE_KEY));

/**
 * Persists the range as-is, even when it equals the current default: an
 * explicitly selected range is an explicit choice and must not silently start
 * tracking future default changes.
 */
export const writeActivityTimeRangeToStorage = (
  storage: Storage,
  range: AlertTimelineTimeRange
): void => {
  storage.set(ACTIVITY_TIME_RANGE_STORAGE_KEY, range);
};

export const readActivityTimeRangeFromUrl = (
  urlStateStorage: IKbnUrlStateStorage
): AlertTimelineTimeRange | undefined =>
  decodeActivityTimeRange(
    urlStateStorage.get<AppStateRecord>(APP_STATE_STORAGE_KEY)?.[ACTIVITY_TIME_RANGE_APP_STATE_KEY]
  );

export const writeActivityTimeRangeToUrl = async (
  urlStateStorage: IKbnUrlStateStorage,
  range: AlertTimelineTimeRange,
  { replace = false }: { replace?: boolean } = {}
): Promise<void> => {
  const appState = urlStateStorage.get<AppStateRecord>(APP_STATE_STORAGE_KEY) ?? {};
  await urlStateStorage.set(
    APP_STATE_STORAGE_KEY,
    { ...appState, [ACTIVITY_TIME_RANGE_APP_STATE_KEY]: range },
    { replace }
  );
};
