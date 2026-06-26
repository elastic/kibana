/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDEX_PATTERNS } from './default_index_patterns';

/**
 * Parses the Significant Events index patterns advanced setting value into a
 * list of glob-style patterns. Falls back to {@link DEFAULT_INDEX_PATTERNS}
 * when the value is empty or whitespace-only.
 */
export function parseSigEventsIndexPatterns(raw: string | undefined): string[] {
  const patterns = (raw ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  return patterns.length > 0 ? patterns : [DEFAULT_INDEX_PATTERNS];
}
