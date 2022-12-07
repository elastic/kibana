/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { waitForVisualizations } from '../utils';

export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/stress_test'],
  esArchives: ['test/functional/fixtures/es_archiver/stress_test'],
}).step('Go to dashboard', async ({ page, kbnUrl, kibanaServer, log }) => {
  await kibanaServer.uiSettings.update({ 'histogram:maxBars': 100 });
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
});
