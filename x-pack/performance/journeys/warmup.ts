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

export const journey = new Journey({
  skipAutoLogin: true,
  extendContext: ({ page, log }) => ({
    toasts: new ToastsService(log, page),
  }),
})
  .step('Login', async ({ page, kbnUrl, inputDelays }) => {
    await page.goto(kbnUrl.get());

    await page.type(subj('loginUsername'), 'elastic', { delay: inputDelays.TYPING });
    await page.type(subj('loginPassword'), 'changeme', { delay: inputDelays.TYPING });
    await page.click(subj('loginSubmit'), { delay: inputDelays.MOUSE_CLICK });

    await page.waitForSelector('#headerUserMenu');
  })

  .step('Go to Sample Data Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/home#/tutorial_directory/sampleData`));

    await page.waitForSelector(subj('showSampleDataButton'));
  })

  .step('Open Sample Data pane', async ({ page }) => {
    // open the "other sample data sets" section
    await page.click(subj('showSampleDataButton'));
    // wait for the logs card to be visible
    await page.waitForSelector(subj('sampleDataSetCardecommerce'));
  })

  .step('Install Ecommerce Sample Data', async ({ page, toasts }) => {
    // click the "add data" button
    await page.click(subj('addSampleDataSetecommerce'));
    // wait for the toast acknowledging installation
    await toasts.waitForAndClear('installed');
  })

  .step('Install Flights Sample Data', async ({ page, toasts }) => {
    // click the "add data" button
    await page.click(subj('addSampleDataSetflights'));
    // wait for the toast acknowledging installation
    await toasts.waitForAndClear('installed');
  })

  .step('Install Logs Sample Data', async ({ page, toasts }) => {
    // click the "add data" button
    await page.click(subj('addSampleDataSetlogs'));
    // wait for the toast acknowledging installation
    await toasts.waitForAndClear('installed');
  })

  .step('Go to dashboards', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f`));
    await waitForVisualizations(page, 12);
    await page.goto(kbnUrl.get(`/app/dashboards#/view/7adfa750-4c81-11e8-b3d7-01146121b73d`));
    await waitForVisualizations(page, 14);
    await page.goto(kbnUrl.get(`/app/dashboards#/view/edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b`));
    await waitForVisualizations(page, 11);
  })

  .step('Go to Sample Data Page again', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/home#/tutorial_directory/sampleData`));
    await page.waitForSelector(subj('showSampleDataButton'));
    // open the "other sample data sets" section
    await page.click(subj('showSampleDataButton'));
  })

  .step('Remove Sample Data', async ({ page, toasts }) => {
    // click the "remove" button
    await page.click(subj('removeSampleDataSetecommerce'));
    // wait for the toast acknowledging uninstallation
    await toasts.waitForAndClear('uninstalled');
    // click the "remove" button
    await page.click(subj('removeSampleDataSetflights'));
    // wait for the toast acknowledging uninstallation
    await toasts.waitForAndClear('uninstalled');
    // click the "remove" button
    await page.click(subj('removeSampleDataSetlogs'));
    // wait for the toast acknowledging uninstallation
    await toasts.waitForAndClear('uninstalled');
  });
