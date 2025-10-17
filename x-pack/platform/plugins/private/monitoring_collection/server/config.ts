/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monitoringCollectionSchema, type MonitoringCollectionConfig } from '@kbn/metrics-config';

export type { MonitoringCollectionConfig };

export const configSchema = monitoringCollectionSchema;

export function createConfig(config: MonitoringCollectionConfig) {
  return config;
}
