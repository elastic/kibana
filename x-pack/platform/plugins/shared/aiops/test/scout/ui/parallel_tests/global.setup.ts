/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Load farequote and ecommerce data', async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded(testData.FAREQUOTE_ES_ARCHIVE);
  await esArchiver.loadIfNeeded(testData.ECOMMERCE_ES_ARCHIVE);
});
