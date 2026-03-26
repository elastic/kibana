/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CATALOG_INDEX_NAME = '.kibana-data-source-catalog';

export const DEFAULT_FIELD_LIMIT = 500;

export const DEFAULT_SECURITY_PATTERNS = [
  'logs-*',
  'metrics-*',
  'filebeat-*',
  'winlogbeat-*',
  'packetbeat-*',
  '.alerts-security.*',
  '.siem-signals-*',
  'endgame-*',
];

export const FRESHNESS_THRESHOLDS = {
  live: 60 * 60 * 1000,
  recent: 24 * 60 * 60 * 1000,
  stale: 7 * 24 * 60 * 60 * 1000,
} as const;

export const CATALOG_VERSION = 1;
