/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Setup environment for Lens tests', async ({ esArchiver }) => {
  await Promise.all([
    esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH),
    esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LONG_WINDOW_LOGSTASH),
    esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.KIBANA_SAMPLE_DATA_FLIGHTS),
  ]);
});
