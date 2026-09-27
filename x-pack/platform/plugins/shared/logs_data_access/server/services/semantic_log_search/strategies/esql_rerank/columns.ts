/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The field CATEGORIZE and LATEST operate on throughout this strategy.
export const MESSAGE_FIELD = 'message';

// Column-name contract between buildCategorizeQuery (writer) and parseEsqlPatternResponse (reader).
// One source of truth: a name change here propagates to both sides without a silent mismatch.
export const CATEGORIZE_COLUMNS = {
  count: 'count',
  pattern: 'pattern',
  firstSeen: 'first_seen',
  lastSeen: 'last_seen',
  sample: 'sample',
  score: '_score',
} as const;

// Column emitted by the count probe: STATS total = COUNT(*).
export const PROBE_TOTAL_COLUMN = 'total';
