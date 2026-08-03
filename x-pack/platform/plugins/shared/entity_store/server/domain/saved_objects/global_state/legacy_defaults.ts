/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitEqualToBaseline, type LogExtractionConfig } from './constants';

// Frozen snapshot of the defaults that pre-overrides-format code baked into stored docs
// (docs with defaultsVersion !== 'latest'). Never change these values — they describe what
// old code wrote, not what the current defaults are.
const LEGACY_LOG_EXTRACTION_DEFAULTS = {
  additionalIndexPatterns: [],
  excludedIndexPatterns: [],
  fieldHistoryLength: 10,
  lookbackPeriod: '3h',
  delay: '1m',
  docsLimit: 10000,
  maxLogsPerPage: 50_000,
  timeout: '59s',
  frequency: '1m',
  maxTimeWindowSize: '15m',
  maxLogsPerWindow: 100_000,
  maxLogsPerWindowCapBehavior: 'drop',
} as const satisfies LogExtractionConfig;

export const getLegacyLogExtractionOverrides = (
  stored: Partial<LogExtractionConfig>
): Partial<LogExtractionConfig> => omitEqualToBaseline(stored, LEGACY_LOG_EXTRACTION_DEFAULTS);
