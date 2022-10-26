/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

import { ToastsService } from '../services/toasts';
import { waitForVisualizations } from '../utils';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/flights'],
  kbnArchives: ['x-pack/performance/kbn_archives/flights_no_map_dashboard'],
  extendContext: ({ page, log }) => ({
    toasts: new ToastsService(log, page),
  }),
}).step('Go to Flights Dashboard', async ({ kbnUrl, page }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/7adfa750-4c81-11e8-b3d7-01146121b73d`));
  await waitForVisualizations(page, 13);
});
