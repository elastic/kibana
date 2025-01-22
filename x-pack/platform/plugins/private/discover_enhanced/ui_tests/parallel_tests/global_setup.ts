/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ingestTestDataHook } from '@kbn/scout';
import { type FullConfig } from '@playwright/test';
import { testData } from '../fixtures';

async function globalSetup(config: FullConfig) {
  // add archives to load, if needed
  const archives = [
    testData.ES_ARCHIVES.LOGSTASH,
    testData.ES_ARCHIVES.NO_TIME_FIELD,
    testData.ES_ARCHIVES.ECOMMERCE,
  ];

  return ingestTestDataHook(config, archives);
}

// eslint-disable-next-line import/no-default-export
export default globalSetup;
