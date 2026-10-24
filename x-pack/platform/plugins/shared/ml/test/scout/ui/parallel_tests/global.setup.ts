/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

const FAREQUOTE_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/ml/farequote';

globalSetupHook('Load farequote data', async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded(FAREQUOTE_ES_ARCHIVE);
});
