/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Per-bucket Color-by / Stat selection, persisted to `localStorage`.
 *
 * The Grouped grid view lets the user pick a metric (`Color by`) and an
 * aggregation (`Stat`) per bucket — one bucket being a single category
 * card (`hosts`, `services`, …) or, for Kubernetes, a single sub-type
 * row (`kubernetes:pods`, `kubernetes:nodes`, …).
 *
 * We persist the choices per-bucket so the user's setup survives
 * navigation between `/entities` and the per-category pages
 * (`/entities/hosts`, `/entities/kubernetes`). Same pattern as the
 * `useEntitiesViewMode` hook in `all_entities_view.tsx`: hydrate from
 * storage on first render, write back on every change, no cross-tab
 * sync (the user is always in one tab when they click around).
 */

import { useCallback, useState } from 'react';
import {
  STAT_OPTIONS,
  findMetric,
  getDefaultMetricId,
  type BucketKey,
  type StatId,
} from './bucket_metrics';

const STORAGE_KEY = 'entityCentricLab.bucketMetricSelection.v1';
const DEFAULT_STAT: StatId = 'last';

export interface BucketSelection {
  readonly metricId: string;
  readonly statId: StatId;
}

interface StoredSelectionMap {
  readonly [bucketKey: string]: BucketSelection | undefined;
}

const isStatId = (value: unknown): value is StatId =>
  typeof value === 'string' && STAT_OPTIONS.some((option) => option.id === value);

const isStoredSelection = (value: unknown): value is BucketSelection =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as BucketSelection).metricId === 'string' &&
      isStatId((value as BucketSelection).statId)
  );

const readStorage = (): StoredSelectionMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StoredSelectionMap;
  } catch {
    return {};
  }
};

const writeStorage = (map: StoredSelectionMap): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota / blocked — keep the in-memory value so the current session
    // still works; the preference just won't persist.
  }
};

/**
 * Hydrate the selection for a bucket. Validates the persisted metricId
 * against the *current* catalog so a stale id (catalog renamed since
 * the user last visited) silently falls back to the bucket's default
 * instead of leaving the dropdown showing an unknown value.
 */
const hydrate = (bucketKey: BucketKey): BucketSelection => {
  const stored = readStorage()[bucketKey];
  if (!isStoredSelection(stored)) {
    return { metricId: getDefaultMetricId(bucketKey), statId: DEFAULT_STAT };
  }
  const metric = findMetric(bucketKey, stored.metricId);
  return {
    metricId: metric ? stored.metricId : getDefaultMetricId(bucketKey),
    statId: stored.statId,
  };
};

export const useBucketMetricSelection = (
  bucketKey: BucketKey
): {
  readonly selection: BucketSelection;
  readonly setMetricId: (metricId: string) => void;
  readonly setStatId: (statId: StatId) => void;
} => {
  const [selection, setSelection] = useState<BucketSelection>(() => hydrate(bucketKey));

  const persist = useCallback(
    (next: BucketSelection) => {
      setSelection(next);
      const current = readStorage();
      writeStorage({ ...current, [bucketKey]: next });
    },
    [bucketKey]
  );

  const setMetricId = useCallback(
    (metricId: string) => persist({ ...selection, metricId }),
    [persist, selection]
  );

  const setStatId = useCallback(
    (statId: StatId) => persist({ ...selection, statId }),
    [persist, selection]
  );

  return { selection, setMetricId, setStatId };
};
