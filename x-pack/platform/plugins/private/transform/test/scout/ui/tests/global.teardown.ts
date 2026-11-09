/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';
import { DATA_VIEWS } from '../fixtures/constants';

globalTeardownHook('Remove transform source data views', async ({ apiServices, kbnClient }) => {
  for (const dataView of Object.values(DATA_VIEWS)) {
    await apiServices.dataViews.delete(dataView.id);
  }

  await kbnClient.uiSettings.unset('dateFormat:tz');
});
