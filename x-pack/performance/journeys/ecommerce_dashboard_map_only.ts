/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';

import { waitForChrome, waitForVisualizations } from '../utils';

export const journey = new Journey({
  esArchives: ['x-pack/performance/es_archives/ecommerce'],
  kbnArchives: ['x-pack/performance/kbn_archives/ecommerce_map_only_dashboard'],
}).step('Go to Ecommerce Dashboard', async ({ page, kbnUrl }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/914d5090-55dd-11ed-989d-f3a363484c6c`));

  await waitForChrome(page);
  await waitForVisualizations(page, 1);
});
