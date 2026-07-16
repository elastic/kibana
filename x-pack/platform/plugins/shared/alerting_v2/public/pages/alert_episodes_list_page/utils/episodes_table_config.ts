/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { isNumber, isPlainObject } from 'lodash';
import { ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_SECTION_ID } from '../../../constants';

/** Namespace for episodes table config inside the `_a` app-state blob */
export const EPISODES_TABLE_APP_STATE_KEY = 'episodesTable' as const;

/** localStorage key for all episodes table display options */
export const EPISODES_TABLE_CONFIG_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.tableConfiguration` as const;

export interface EpisodesTableConfig {
  rowHeight: number;
}

export const DEFAULT_EPISODES_TABLE_CONFIG: EpisodesTableConfig = {
  rowHeight: ROWS_HEIGHT_OPTIONS.default,
};

type AppStateRecord = Record<string, unknown> & {
  [EPISODES_TABLE_APP_STATE_KEY]?: unknown;
};

// Bounds the row height to a valid line count (`auto` is -1). Values come from the URL and
// localStorage, so an unbounded check would let a bad value render absurdly tall rows. Mirrors
// @kbn/unified-data-table's `isValidRowHeight`, which isn't exported for reuse.
const MIN_ROW_HEIGHT = -1;
const MAX_ROW_HEIGHT = 20;

const isValidRowHeight = (v: unknown): v is number =>
  isNumber(v) && Number.isInteger(v) && v >= MIN_ROW_HEIGHT && v <= MAX_ROW_HEIGHT;

function decodeEpisodesTableConfig(raw: unknown): Partial<EpisodesTableConfig> | undefined {
  if (!isPlainObject(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const result: Partial<EpisodesTableConfig> = {};
  if (isValidRowHeight(o.rowHeight)) {
    result.rowHeight = o.rowHeight;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function encodeEpisodesTableConfig(config: EpisodesTableConfig): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (config.rowHeight !== DEFAULT_EPISODES_TABLE_CONFIG.rowHeight) {
    out.rowHeight = config.rowHeight;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Merges table config from localStorage and URL, with URL winning per-field over localStorage,
 * and localStorage winning over the defaults.
 */
export const mergeEpisodesTableConfig = (
  fromStorage?: Partial<EpisodesTableConfig> | null,
  fromUrl?: Partial<EpisodesTableConfig> | null
): EpisodesTableConfig => ({
  ...DEFAULT_EPISODES_TABLE_CONFIG,
  ...(fromStorage ?? {}),
  ...(fromUrl ?? {}),
});

export const readEpisodesTableConfigFromStorage = (
  storage: Storage
): Partial<EpisodesTableConfig> | undefined =>
  decodeEpisodesTableConfig(storage.get(EPISODES_TABLE_CONFIG_STORAGE_KEY)) ?? undefined;

export const writeEpisodesTableConfigToStorage = (
  storage: Storage,
  config: EpisodesTableConfig
): void => {
  // Strip default fields before persisting, like the URL write, so untouched fields keep tracking
  // the current default instead of being pinned. Drop the key entirely when nothing diverges.
  const serialized = encodeEpisodesTableConfig(config);
  if (serialized === null) {
    storage.remove(EPISODES_TABLE_CONFIG_STORAGE_KEY);
  } else {
    storage.set(EPISODES_TABLE_CONFIG_STORAGE_KEY, serialized);
  }
};

export const readEpisodesTableConfigFromUrl = (
  urlStateStorage: IKbnUrlStateStorage
): Partial<EpisodesTableConfig> | undefined => {
  const raw = urlStateStorage.get<AppStateRecord>('_a')?.[EPISODES_TABLE_APP_STATE_KEY];
  return decodeEpisodesTableConfig(raw) ?? undefined;
};

export const writeEpisodesTableConfigToUrl = async (
  urlStateStorage: IKbnUrlStateStorage,
  config: EpisodesTableConfig
): Promise<void> => {
  const serialized = encodeEpisodesTableConfig(config);
  const appState = urlStateStorage.get<AppStateRecord>('_a') ?? {};
  const {
    [EPISODES_TABLE_APP_STATE_KEY]: _ignoredEpisodesTableState,
    ...appStateWithoutEpisodesTable
  } = appState;

  const nextAppState: AppStateRecord =
    serialized === null
      ? appStateWithoutEpisodesTable
      : { ...appStateWithoutEpisodesTable, [EPISODES_TABLE_APP_STATE_KEY]: serialized };

  // Use replace: true so display tweaks don't spam browser history
  await urlStateStorage.set('_a', nextAppState, { replace: true });
};
