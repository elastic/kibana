/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { waitForVisualizations } from '../utils';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


export const journey = new Journey({
  kbnArchives: ['test/functional/fixtures/kbn_archiver/stress_test'],
  esArchives: ['test/functional/fixtures/es_archiver/stress_test'],
}).step('Update settings', async ({ kibanaServer }) => {
  await kibanaServer.uiSettings.update({ 'histogram:maxBars': 100 });
}).step('Go to dashboard 1', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
}).step('Go to dashboard 2', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
}).step('Go to dashboard 3', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
}).step('Go to dashboard 4', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
}).step('Go to dashboard 5', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
}).step('Go to dashboard 6', async ({ page, kbnUrl, log }) => {
  await page.goto(kbnUrl.get(`/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`));
  await waitForVisualizations(page, log, 1);
  await page.goto(kbnUrl.get('/app/home'));
  await sleep(1000);
});
