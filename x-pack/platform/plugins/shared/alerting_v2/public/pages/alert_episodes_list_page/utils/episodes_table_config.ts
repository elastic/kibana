/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { z } from '@kbn/zod';
import { ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { isPlainObject } from 'lodash';
import { ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_SECTION_ID } from '../../../constants';

/** Namespace for episodes table config inside the `_a` app-state blob */
export const EPISODES_TABLE_APP_STATE_KEY = 'episodesTable' as const;

/** localStorage key for all episodes table display options */
export const EPISODES_TABLE_CONFIG_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.tableConfiguration` as const;

const episodesTableColumnSettingSchema = z.object({
  width: z.number().optional(),
  display: z.string().optional(),
});

// Bounds the row height to a valid line count (`auto` is -1). Values come from the URL and
// localStorage, so an unbounded check would let a bad value render absurdly tall rows. Mirrors
// @kbn/unified-data-table's `isValidRowHeight`, which isn't exported for reuse.
const rowHeightSchema = z.number().int().min(-1).max(20);

/**
 * One field per persisted display option. Add more fields here as more options are persisted —
 * decode/encode below validate and serialize per-field automatically.
 */
const episodesTableConfigSchema = z.object({
  visibleColumns: z.array(z.string()).min(1),
  sort: z.object({
    sortField: z.string().min(1),
    sortDirection: z.enum(['asc', 'desc']),
  }),
  rowHeight: rowHeightSchema,
  columnSettings: z.record(z.string(), episodesTableColumnSettingSchema),
});

export type EpisodesTableConfig = z.infer<typeof episodesTableConfigSchema>;
export type EpisodesTableColumnSettings = EpisodesTableConfig['columnSettings'];

export const DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS: string[] = [
  'episode.status',
  'severity',
  '@timestamp',
  'rule.id',
  'duration',
  'tags',
  'assignees',
];

export const DEFAULT_EPISODES_TABLE_SORT: EpisodesTableConfig['sort'] = {
  sortField: '@timestamp',
  sortDirection: 'desc',
};

export const DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS: EpisodesTableColumnSettings = {
  duration: { width: 110 },
  assignees: { width: 120 },
  'episode.status': { width: 110 },
  severity: { width: 100 },
};

export const DEFAULT_EPISODES_TABLE_CONFIG: EpisodesTableConfig = {
  visibleColumns: DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
  sort: DEFAULT_EPISODES_TABLE_SORT,
  rowHeight: ROWS_HEIGHT_OPTIONS.default,
  columnSettings: DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS,
};

type AppStateRecord = Record<string, unknown> & {
  [EPISODES_TABLE_APP_STATE_KEY]?: unknown;
};

type EpisodesTableConfigKey = keyof EpisodesTableConfig;

const configFields = Object.keys(episodesTableConfigSchema.shape) as EpisodesTableConfigKey[];

type EpisodesTableConfigRecord = Partial<Record<EpisodesTableConfigKey, unknown>>;

const isPlainRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

/**
 * Validates each field independently against its own schema, so one corrupted or missing
 * field falls back to the default without discarding the other, still-valid fields.
 */
const decodeEpisodesTableConfig = (raw: unknown): Partial<EpisodesTableConfig> | undefined => {
  if (!isPlainRecord(raw)) return undefined;
  const result: EpisodesTableConfigRecord = {};
  for (const field of configFields) {
    const parsed = episodesTableConfigSchema.shape[field].safeParse(raw[field]);
    if (!parsed.success) {
      continue;
    }
    result[field] = parsed.data;
  }
  // `result` was built generically per schema field above, so it matches EpisodesTableConfig's
  // shape by construction — TS just can't verify that field-by-field.
  return Object.keys(result).length > 0 ? (result as Partial<EpisodesTableConfig>) : undefined;
};

const encodeEpisodesTableConfig = (
  config: EpisodesTableConfig
): EpisodesTableConfigRecord | null => {
  const out: EpisodesTableConfigRecord = {};
  for (const field of configFields) {
    if (deepEqual(config[field], DEFAULT_EPISODES_TABLE_CONFIG[field])) {
      continue;
    }
    out[field] = config[field];
  }
  return Object.keys(out).length > 0 ? out : null;
};

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

  // Use replace: true so display tweaks (especially column resizes) don't spam browser history
  await urlStateStorage.set('_a', nextAppState, { replace: true });
};
