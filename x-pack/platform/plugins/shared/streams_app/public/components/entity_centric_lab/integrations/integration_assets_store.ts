/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Client-side "enabled" state for recommended integration assets.
 *
 * Integrations ship alert rules and SLO templates split into `enabled` (already
 * on) and `recommended` (not yet enabled). Enabling a recommended asset from
 * the detail page moves it into the enabled set and bumps the "Enabled assets
 * X/Y" progress — persisted to `localStorage` so the demo state sticks, and
 * broadcast so the Overview cards update live alongside the detail page.
 *
 * Only *overrides* are stored (the set of recommended asset keys the user
 * turned on); base-enabled assets need no entry. Keyed by
 * `${integrationId}::${assetId}`.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'entityCentricLab.integrationAssets.v1';
const GLOBAL_STATE_KEY = '__kbnEntityCentricLab_integrationAssets_v1__' as const;

type Listener = () => void;

interface SharedState {
  readonly enabledKeys: Set<string>;
  readonly listeners: Set<Listener>;
  hydrated: boolean;
}

const assetKey = (integrationId: string, assetId: string): string => `${integrationId}::${assetId}`;

const getSharedState = (): SharedState => {
  const root = globalThis as unknown as Record<string, SharedState | undefined>;
  let state = root[GLOBAL_STATE_KEY];
  if (!state) {
    state = { enabledKeys: new Set<string>(), listeners: new Set<Listener>(), hydrated: false };
    root[GLOBAL_STATE_KEY] = state;
  }
  return state;
};

const readStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const writeStorage = (state: SharedState): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.enabledKeys]));
  } catch {
    // Out of quota or storage blocked — in-memory copy is still good.
  }
};

const hydrateOnce = (): SharedState => {
  const state = getSharedState();
  if (state.hydrated) return state;
  state.hydrated = true;
  for (const key of readStorage()) state.enabledKeys.add(key);
  return state;
};

const notify = (): void => {
  for (const listener of [...getSharedState().listeners]) listener();
};

/** Whether a recommended asset has been enabled by the user. */
export const isRecommendedAssetEnabled = (integrationId: string, assetId: string): boolean =>
  hydrateOnce().enabledKeys.has(assetKey(integrationId, assetId));

/** Enable a recommended asset (idempotent). */
export const enableRecommendedAsset = (integrationId: string, assetId: string): void => {
  const state = hydrateOnce();
  const key = assetKey(integrationId, assetId);
  if (state.enabledKeys.has(key)) return;
  state.enabledKeys.add(key);
  writeStorage(state);
  notify();
};

/** Count how many of the given recommended asset ids are enabled. */
export const countEnabledRecommended = (
  integrationId: string,
  recommendedAssetIds: readonly string[]
): number => {
  const state = hydrateOnce();
  return recommendedAssetIds.reduce(
    (count, assetId) =>
      state.enabledKeys.has(assetKey(integrationId, assetId)) ? count + 1 : count,
    0
  );
};

export const subscribeIntegrationAssets = (listener: Listener): (() => void) => {
  const { listeners } = hydrateOnce();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook that re-renders the caller whenever any asset enable-state
 * changes. Returns a monotonically increasing version so consumers can depend
 * on it in `useMemo` without threading individual keys.
 */
export const useIntegrationAssetsVersion = (): number =>
  useSyncExternalStore(
    subscribeIntegrationAssets,
    () => hydrateOnce().enabledKeys.size,
    () => 0
  );
