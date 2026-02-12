/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for Transform API tests', async ({ esArchiver, log }) => {
  log.debug('[setup] Loading ES archive with farequote data...');
  await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
});
