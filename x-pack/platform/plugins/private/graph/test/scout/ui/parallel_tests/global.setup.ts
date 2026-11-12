/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { SECREPO_ES_ARCHIVE } from '../fixtures/constants';

globalSetupHook('load Graph test data', async ({ esArchiver }) => {
  await esArchiver.loadIfNeeded(SECREPO_ES_ARCHIVE);
});
