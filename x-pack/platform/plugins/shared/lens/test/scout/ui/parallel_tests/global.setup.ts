/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Setup environment for Lens tests', async ({ esArchiver, apiServices }) => {
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'lens.enable_esql_conversion': 'true',
    },
  });
  await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
});
