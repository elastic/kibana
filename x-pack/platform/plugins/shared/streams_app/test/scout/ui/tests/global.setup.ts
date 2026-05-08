/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup environment for streams tests', async ({ apiServices, log }) => {
  log.debug('[setup] turning off discover.isEsqlDefault');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'discover.isEsqlDefault': false,
    },
  });

  log.debug('[setup] Enabling streams...');
  await apiServices.streams.enable();
});
