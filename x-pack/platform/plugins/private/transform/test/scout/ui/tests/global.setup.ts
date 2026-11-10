/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { DATA_VIEWS, ES_ARCHIVES } from '../fixtures/constants';

globalSetupHook('Load transform source data', async ({ esArchiver, apiServices, kbnClient }) => {
  await esArchiver.loadIfNeeded(ES_ARCHIVES.ECOMMERCE);
  await esArchiver.loadIfNeeded(ES_ARCHIVES.FAREQUOTE);

  for (const dataView of Object.values(DATA_VIEWS)) {
    await apiServices.dataViews.create({ ...dataView, override: true });
  }

  await kbnClient.uiSettings.update({ 'dateFormat:tz': 'UTC' });
});
