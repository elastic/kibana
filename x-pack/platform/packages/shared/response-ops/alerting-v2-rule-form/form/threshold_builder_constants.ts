/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Default index / data stream shown in the threshold alert builder data source control. */
export const DEFAULT_THRESHOLD_DATA_SOURCE = 'metrics-system.cpu-default';

/** Preset data sources for the threshold builder (ES|QL `FROM` targets). */
export const THRESHOLD_DATA_SOURCE_CHOICES = [
  'metrics-system.cpu-default',
  'logs-*',
  'metrics-*',
  'traces-*',
] as const;
