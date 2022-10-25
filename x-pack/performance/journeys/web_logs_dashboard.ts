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
  extendContext: ({ page, log }) => ({
    toasts: new ToastsService(log, page),
  }),
})
  .step('Go to Sample Data Page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/home#/tutorial_directory/sampleData`));

    await page.waitForSelector(subj('showSampleDataButton'));
  })

  .step('Open Sample Data pane', async ({ page }) => {
    // open the "other sample data sets" section
    await page.click(subj('showSampleDataButton'));
    // wait for the logs card to be visible
    await page.waitForSelector(subj('sampleDataSetCardlogs'));
  })

  .step('Remove Sample Data Logs if installed', async ({ page, log, toasts }) => {
    if (!(await page.$(subj('removeSampleDataSetlogs')))) {
      log.info('Logs data does not need to be removed');
      return;
    }

    // click the "remove" button
    await page.click(subj('removeSampleDataSetlogs'));
    // wait for the toast acknowledging uninstallation
    await toasts.waitForAndClear('uninstalled');
  })

  .step('Install Logs Sample Data', async ({ page, toasts }) => {
    // click the "add data" button
    await page.click(subj('addSampleDataSetlogs'));
    // wait for the toast acknowledging installation
    await toasts.waitForAndClear('installed');
  })

  .step('Go to Web Logs Dashboard', async ({ page }) => {
    await page.click(subj('launchSampleDataSetlogs'));
    await page.click(subj('viewSampleDataSetlogs-dashboard'));

    await waitForVisualizations(page, 11);
  });
