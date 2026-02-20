/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Ingest data to Elasticsearch', async ({ esArchiver, log }) => {
  // add archives to load, if needed
  const archives = [
    testData.ES_ARCHIVES.LOGSTASH,
    testData.ES_ARCHIVES.NO_TIME_FIELD,
    testData.ES_ARCHIVES.ECOMMERCE,
    testData.ES_ARCHIVES.TSDB_LOGS,
  ];

  log.debug('[setup] loading test data (only if indexes do not exist)...');
  for (const archive of archives) {
    await esArchiver.loadIfNeeded(archive);
  }
});
