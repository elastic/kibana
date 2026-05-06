/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_DATA_CASE_ALIAS,
  CASES_DATA_CASE_ACTIVITY_ALIAS,
  CASES_DATA_CASE_LIFECYCLE_ALIAS,
} from '../../common/constants';

/**
 * The three "surfaces" — one per analytics index. The string values are also used
 * as the suffix in `.internal.cases-data.<surface>-NNNNNN` backing indices and as
 * keys in the writer / metrics surface.
 */
export const CASES_DATA_SURFACES = ['case', 'case_activity', 'case_lifecycle'] as const;
export type CasesDataSurface = (typeof CASES_DATA_SURFACES)[number];

export const CASES_DATA_ALIAS_BY_SURFACE: Record<CasesDataSurface, string> = {
  case: CASES_DATA_CASE_ALIAS,
  case_activity: CASES_DATA_CASE_ACTIVITY_ALIAS,
  case_lifecycle: CASES_DATA_CASE_LIFECYCLE_ALIAS,
};

/**
 * Per-surface ILM rollover alias name. By convention `.cases-data.<surface>` doubles
 * as both the read alias and the rollover alias.
 */
export const getRolloverAlias = (surface: CasesDataSurface): string =>
  CASES_DATA_ALIAS_BY_SURFACE[surface];

/**
 * Initial backing index name for a fresh installation: `.internal.cases-data.<surface>-000001`.
 * Rollover takes over from there.
 */
export const getInitialBackingIndex = (surface: CasesDataSurface): string =>
  `.internal.cases-data.${surface}-000001`;

/** Index template name per surface. */
export const getIndexTemplateName = (surface: CasesDataSurface): string => `cases-data.${surface}`;

export const CASES_DATA_NUMBER_OF_SHARDS = 1;
export const CASES_DATA_AUTO_EXPAND_REPLICAS = '0-1';
export const CASES_DATA_REFRESH_INTERVAL = '15s';

/**
 * Default cadence + retry knobs. Surface in `xpack.cases.analytics.*` config.
 */
export const DEFAULT_RECONCILIATION_INTERVAL = '30m';
export const DEFAULT_WRITE_MAX_RETRIES = 3;
export const DEFAULT_WRITE_RETRY_INITIAL_DELAY_MS = 250;
