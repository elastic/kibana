/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Ingest data to Elasticsearch', async ({ apiServices, esArchiver, log }) => {
  log.debug('[setup] set isEsqlDefault feature flag to false');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'discover.isEsqlDefault': false,
    },
  });

  const archives = [
    testData.ES_ARCHIVES.FAREQUOTE,
    testData.ES_ARCHIVES.MODULE_SAMPLE_LOGS,
    testData.ES_ARCHIVES.IHP_OUTLIER,
  ];

  log.debug('[setup] loading ML data visualizer archives (only if indexes do not exist)...');
  for (const archive of archives) {
    await esArchiver.loadIfNeeded(archive);
  }
});
