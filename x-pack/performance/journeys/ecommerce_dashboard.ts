/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

import { waitForVisualizations } from '../utils';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/ecommerce'],
  kbnArchives: ['x-pack/performance/kbn_archives/ecommerce_no_map_dashboard'],
}).step('Go to Ecommerce Dashboard', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f`));

  await waitForVisualizations(page, 12);
});
