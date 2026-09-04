/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATA_QUALITY_APP_PATH = 'management/data/data_quality';
export const DATA_QUALITY_DETAILS_APP_PATH = 'management/data/data_quality/details';

/**
 * Query-string key the Data Set Quality app reads its rison-encoded state from.
 *
 * Duplicated from `DATA_QUALITY_URL_STATE_KEY` in `@kbn/data-quality/common`, which
 * cannot be imported here: that package already depends on this plugin, so
 * referencing it would make the TypeScript project graph circular.
 */
export const DATA_QUALITY_URL_STATE_KEY = 'pageState';

/** Column headers of the main table, which double as its parsed-row keys. */
export const TABLE_COLUMNS = {
  name: 'Data set name',
  namespace: 'Namespace',
  type: 'Type',
  size: 'Size',
  quality: 'Data set quality',
  degradedDocs: 'Degraded docs (%)',
  failedDocs: 'Failed docs (%)',
  lastActivity: 'Last activity',
  actions: 'Actions',
} as const;

/** Column headers of the details page quality-issues table. */
export const QUALITY_ISSUE_COLUMNS = {
  name: 'Field',
  issue: 'Issue',
  docsCount: 'Documents',
  lastOccurrence: 'Last occurred',
} as const;

/**
 * The metering stats API backing size on serverless caches for ~30s and reports 0
 * until it refreshes; on stateful the byte size comes from index stats, which can lag
 * behind a just-written doc until the shard flushes. Size assertions therefore allow
 * four cache windows so a delayed refresh on a busy cluster can still be observed.
 */
export const METERING_CACHE_TIMEOUT_MS = 120_000;

export const TEXTS = {
  noActivity: 'No activity in the selected timeframe',
  qualityPoor: 'Poor',
  setFailureStore: 'Set failure store',
  noFailureStore: 'No failure store',
  fieldIgnored: 'Field ignored',
  fieldCharacterLimitExceeded: 'Field character limit exceeded',
  documentsIndexingFailed: 'Documents indexing failed',
} as const;
