/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import type { IKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { isPlainObject } from 'lodash';
import { ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';
import {
  DEFAULT_EPISODES_TABLE_CONFIG,
  episodesTableConfigSchema,
  type EpisodesTableConfig,
} from '@kbn/alerting-v2-episodes-ui/utils/episodes_table_config';

export {
  DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS,
  DEFAULT_EPISODES_TABLE_CONFIG,
  DEFAULT_EPISODES_TABLE_SORT,
  DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
  type EpisodesTableColumnSettings,
  type EpisodesTableConfig,
} from '@kbn/alerting-v2-episodes-ui/utils/episodes_table_config';

/** Namespace for alerts table config inside the `_a` app-state blob */
export const ALERTS_TABLE_APP_STATE_KEY = 'alertsTable' as const;

/** localStorage key for all alerts table display options (composed from the renamed APP_ID). */
export const EPISODES_TABLE_CONFIG_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.tableConfiguration` as const;

type AppStateRecord = Record<string, unknown> & {
  [ALERTS_TABLE_APP_STATE_KEY]?: unknown;
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
  const raw = urlStateStorage.get<AppStateRecord>('_a')?.[ALERTS_TABLE_APP_STATE_KEY];
  return decodeEpisodesTableConfig(raw) ?? undefined;
};

export const writeEpisodesTableConfigToUrl = async (
  urlStateStorage: IKbnUrlStateStorage,
  config: EpisodesTableConfig
): Promise<void> => {
  const serialized = encodeEpisodesTableConfig(config);
  const appState = urlStateStorage.get<AppStateRecord>('_a') ?? {};
  const { [ALERTS_TABLE_APP_STATE_KEY]: _ignoredAlertsTableState, ...appStateWithoutAlertsTable } =
    appState;

  const nextAppState: AppStateRecord =
    serialized === null
      ? appStateWithoutAlertsTable
      : { ...appStateWithoutAlertsTable, [ALERTS_TABLE_APP_STATE_KEY]: serialized };

  // Use replace: true so display tweaks (especially column resizes) don't spam browser history
  await urlStateStorage.set('_a', nextAppState, { replace: true });
};
