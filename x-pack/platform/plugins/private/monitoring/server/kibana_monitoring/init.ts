/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkUploader, BulkUploaderOptions } from './bulk_uploader';

export type InitBulkUploaderOptions = Omit<BulkUploaderOptions, 'interval'>;

/**
 * Initialize different types of Kibana Monitoring
 * TODO: remove this in 7.0
 * - Ops Events - essentially Kibana's /api/status
 * - Usage Stats - essentially Kibana's /api/stats
 * - Kibana Settings - select uiSettings
 * @param {Object} kbnServer manager of Kibana services - see `src/legacy/server/kbn_server` in Kibana core
 * @param {Object} server HapiJS server instance
 */
export function initBulkUploader({ config, ...params }: InitBulkUploaderOptions) {
  const interval = config.kibana.collection.interval;
  return new BulkUploader({
    interval,
    config,
    ...params,
  });
}
