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
    await page.waitForSelector(subj('sampleDataSetCardflights'));
  })

  .step('Remove Flights Sample Data if installed', async ({ page, log, toasts }) => {
    if (!(await page.$(subj('removeSampleDataSetflights')))) {
      log.info('Flights data does not need to be removed');
      return;
    }

    // click the "remove" button
    await page.click(subj('removeSampleDataSetflights'));
    // wait for the toast acknowledging uninstallation
    await toasts.waitForAndClear('uninstalled');
  })

  .step('Install Flights Sample Data', async ({ page, toasts }) => {
    // click the "add data" button
    await page.click(subj('addSampleDataSetflights'));
    // wait for the toast acknowledging installation
    await toasts.waitForAndClear('installed');
  })

  .step('Go to Flights Dashboard', async ({ page }) => {
    await page.click(subj('launchSampleDataSetflights'));
    await page.click(subj('viewSampleDataSetflights-dashboard'));

    await waitForVisualizations(page, 14);
  })

  .step('Go to Airport Connections Visualizations Edit', async ({ page }) => {
    await page.click(subj('dashboardEditMode'));

    const flightsPanelHeadingSelector = `embeddablePanelHeading-[Flights]AirportConnections(HoverOverAirport)`;
    const panelToggleMenuIconSelector = `embeddablePanelToggleMenuIcon`;
    await page.click(subj(`${flightsPanelHeadingSelector} > ${panelToggleMenuIconSelector}`));

    await page.click(subj('embeddablePanelAction-editPanel'));

    await waitForVisualizations(page, 1);
  });
