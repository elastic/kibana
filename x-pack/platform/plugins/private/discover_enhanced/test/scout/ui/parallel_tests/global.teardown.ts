/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';

globalTeardownHook('Teardown Discover Enhanced tests data', async ({ apiServices, log }) => {
  log.debug('[teardown:discover-enhanced] resetting isEsqlDefault feature flag');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'discover.isEsqlDefault': null,
    },
  });
});
