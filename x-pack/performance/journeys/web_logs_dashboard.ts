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
  esArchives: ['x-pack/performance/es_archives/logs'],
  kbnArchives: ['x-pack/performance/kbn_archives/logs_no_map_dashboard'],
  extendContext: ({ page, log }) => ({
    toasts: new ToastsService(log, page),
  }),
}).step('Go to Web Logs Dashboard', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b`));
  await waitForVisualizations(page, 11);
});
