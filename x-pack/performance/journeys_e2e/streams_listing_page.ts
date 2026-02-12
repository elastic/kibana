/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupListingPageData } from '../synthtrace_data/streams_data';

const STREAMS_SEARCH_SELECTOR =
  'input[aria-label="Search streams by name"], [role="searchbox"], input[type="search"]';

export const journey = new Journey({
  beforeSteps: async ({ kibanaServer, es, log }) => {
    await setupListingPageData(kibanaServer, es, log);
  },
})
  .step('Go to Streams listing page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams'));
    await page.waitForSelector(subj('streamsTable'), { timeout: 120000 });
  })
  .step('Search for a classic stream', async ({ page, inputDelays }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await searchBox.type('logs-perf-classic-00001', { delay: inputDelays.TYPING });
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Clear search and expand all streams', async ({ page }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await page.waitForSelector(subj('streamsTable'));
    // Initial state has streams collapsed, so "Expand all" button is shown
    await page.click(subj('streamsExpandAllButton'));
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Collapse all streams', async ({ page }) => {
    // After expanding, "Collapse all" button is shown
    await page.click(subj('streamsCollapseAllButton'));
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Navigate to a stream detail page', async ({ page }) => {
    const streamLink = page.locator(subj('streamsNameLink-logs.child1'));
    await streamLink.click();
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  });
