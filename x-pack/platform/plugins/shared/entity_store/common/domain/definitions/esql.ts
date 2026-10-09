/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const RECENT_DATA_PREFIX = 'recent';

/**
 * Reference to recent data in ESQL queries
 */
export function recentData(dest: string) {
  return `${RECENT_DATA_PREFIX}.${dest}`;
}
