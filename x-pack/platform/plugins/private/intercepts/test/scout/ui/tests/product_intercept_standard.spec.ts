/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const TRIGGER_DEF_ID = 'productInterceptTrigger';
const INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY = 'intercepts.prompter.clientCache';
const CONFIGURED_STANDARD_INTERCEPT_INTERVAL = 90 * 24 * 60 * 60 * 1000;

test.describe('Standard Product intercept', { tag: '@local-stateful-classic' }, () => {
  test('on initial page load - presents all available navigable steps', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await page.gotoApp('home');

    // Set localStorage to trigger intercept display
    await pageObjects.intercepts.setInterceptTimer(
      TRIGGER_DEF_ID,
      CONFIGURED_STANDARD_INTERCEPT_INTERVAL
    );

    // Refresh the page and expect the intercept to be displayed
    await page.reload();

    await pageObjects.intercepts.waitForInterceptDisplayed(TRIGGER_DEF_ID);

    // Navigate to the intercept steps
    await pageObjects.intercepts.clickProgressionButton();

    let progressionButtonVisible = false;

    // Loop through survey responses
    do {
      // Randomly select one of the NPS buttons (1-4)
      await pageObjects.intercepts.clickRandomNpsButton();
      // The progression button is only visible at the start and completion of the survey
      progressionButtonVisible = await pageObjects.intercepts.isProgressionButtonVisible();
    } while (!progressionButtonVisible);

    const buttonText = await pageObjects.intercepts.getProgressionButtonText();
    expect(buttonText).toBe('Close');

    const interceptText = await pageObjects.intercepts.getInterceptText(TRIGGER_DEF_ID);
    expect(interceptText).toMatch(/Thanks for the feedback!/);
  });

  test('page transitions - transitions from one tab to another and back again will cause the intercept to be displayed if the intercept interval has elapsed on transitioning', async ({
    page,
    pageObjects,
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    // Navigate to home to set a record for new intercept journey
    await page.gotoApp('home');

    // Open a new tab and navigate to the discover app
    const context = page.context();
    const newPage = await context.newPage();
    await newPage.goto(page.url().replace('/home', '/app/discover'));

    // Update record on the new page so the intercept will be in a valid state to display on page transition
    const timerStart = new Date(Date.now() - CONFIGURED_STANDARD_INTERCEPT_INTERVAL - 1000);
    await newPage.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, value);
      },
      {
        key: INTERCEPT_PROMPTER_LOCAL_STORAGE_KEY,
        value: JSON.stringify({
          [TRIGGER_DEF_ID]: {
            timerStart,
          },
        }),
      }
    );

    // Switch back to the original tab and expect the intercept to be displayed
    await page.bringToFront();

    await pageObjects.intercepts.waitForInterceptDisplayed(TRIGGER_DEF_ID);

    // Verify the intercept is visible
    const interceptLocator = pageObjects.intercepts.getInterceptLocator(TRIGGER_DEF_ID);
    await expect(interceptLocator).toBeVisible();

    // Dismiss the intercept in the original tab
    await pageObjects.intercepts.clickDismissButton();

    // Clean up the new tab
    await newPage.close();
  });
});
