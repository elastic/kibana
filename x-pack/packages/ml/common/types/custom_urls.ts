/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { MlAnomalyRecordDoc } from './anomalies';

/**
 * Base Interface for basic custom URL.
 */
export interface MlBaseUrlConfig {
  url_name: string;
  url_value: string;
}

export interface MlKibanaUrlConfig extends MlBaseUrlConfig {
  time_range?: string;
}

export interface MlKibanaUrlConfigWithTimeRange extends MlBaseUrlConfig {
  time_range: string;
}

export type MlUrlConfig = MlBaseUrlConfig | MlKibanaUrlConfig;

export interface MlCustomUrlAnomalyRecordDoc extends MlAnomalyRecordDoc {
  earliest: string;
  latest: string;
}

export function isMlKibanaUrlConfigWithTimeRange(
  arg: unknown
): arg is MlKibanaUrlConfigWithTimeRange {
  return (
    isPopulatedObject(arg, ['url_name', 'url_value', 'time_range']) &&
    typeof arg.time_range === 'string'
  );
}
