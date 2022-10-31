/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { ToastsService } from '../services/toasts';
import { waitForVisualizations } from '../utils';

const sampleData = ['ecommerce', 'flights', 'logs'];

export const journey = new Journey({
  skipAutoLogin: true,
  extendContext: ({ page, log }) => ({
    toasts: new ToastsService(log, page),
  }),
})
  .step('Load sample data via API', async ({ kibanaServer, log }) => {
    for (const name of sampleData) {
      const { status } = await kibanaServer.request({
        path: `/api/sample_data/${name}`,
        method: 'POST',
      });
      log.debug(`Data set '${name}' is added with code '${status}'`);
    }
  })

  .step('Login to Kibana', async ({ page, kbnUrl, inputDelays }) => {
    await page.goto(kbnUrl.get());

    await page.type(subj('loginUsername'), 'elastic', { delay: inputDelays.TYPING });
    await page.type(subj('loginPassword'), 'changeme', { delay: inputDelays.TYPING });
    await page.click(subj('loginSubmit'), { delay: inputDelays.MOUSE_CLICK });

    await page.waitForSelector('#headerUserMenu');
  })

  .step('Go to Sample Data', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/home#/tutorial_directory/sampleData`));
    await page.waitForSelector(subj('showSampleDataButton'));
  })

  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector('#dashboardListingHeading');
  })

  .step('Go to Flights Dasboard', async ({ page, kbnUrl, log }) => {
    log.debug('Loading Flights dashboard');
    await page.click(subj('dashboardListingTitleLink-[Flights]-Global-Flight-Dashboard'));
    log.debug('Loading eCommerce dashboard');
    await waitForVisualizations(page, 16);
  })

  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector('#dashboardListingHeading');
  })

  .step('Go to eCommerce Dasboard', async ({ page, kbnUrl, log }) => {
    log.debug('Loading eCommerce dashboard');
    await page.click(subj('dashboardListingTitleLink-[eCommerce]-Revenue-Dashboard'));
    await waitForVisualizations(page, 14);
  })

  .step('Go to Dashboards Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards`));
    await page.waitForSelector('#dashboardListingHeading');
  })

  .step('Go to Logs Dasboard', async ({ page, kbnUrl, log }) => {
    log.debug('Loading logs dashboard');
    await page.click(subj('dashboardListingTitleLink-[Logs]-Web-Traffic'));
    await waitForVisualizations(page, 12);
  })

  .step('Go to Discover', async ({ page, kbnUrl, log }) => {
    log.debug('Loading eCommerce Discover view last 7d');
    await page.goto(
      kbnUrl.get(
        '/app/discover#/view/3ba638e0-b894-11e8-a6d9-e546fe2bba5f?_g=(time:(from:now-7d,to:now))'
      )
    );
    await page.waitForSelector(subj('discoverDocTable'));
    log.debug('Loading Flights Discover view last 7d');
    await page.goto(
      kbnUrl.get(
        '/app/discover#/view/571aaf70-4c88-11e8-b3d7-01146121b73d?_g=(time:(from:now-7d,to:now))'
      )
    );
    await page.waitForSelector(subj('discoverDocTable'));
    log.debug('Loading Logs Discover view last 7d');
    await page.goto(
      kbnUrl.get(
        '/app/discover#/view/2f360f30-ea74-11eb-b4c6-3d2afc1cb389?_g=(time:(from:now-7d,to:now))'
      )
    );
    await page.waitForSelector(subj('discoverDocTable'));
  })

  .step('Remove Sample Data via API', async ({ kibanaServer, log }) => {
    for (const name of sampleData) {
      const { status } = await kibanaServer.request({
        path: `/api/sample_data/${name}`,
        method: 'DELETE',
      });
      log.debug(`Data set '${name}' is deleted with code '${status}'`);
    }
  });
