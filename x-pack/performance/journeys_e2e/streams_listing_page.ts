/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupListingPageData } from '../synthtrace_data/streams_data';

const STREAMS_SEARCH_SELECTOR = 'input[aria-label="Search streams by name"]';
const STREAMS_EXPAND_ALL_BUTTON = subj('streamsExpandAllButton');
const STREAMS_COLLAPSE_ALL_BUTTON = subj('streamsCollapseAllButton');

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
    const searchBox = page.locator(subj('streamsTable')).locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await searchBox.type('logs-perf-classic-00001', { delay: inputDelays.TYPING });
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Clear search and expand all streams', async ({ page }) => {
    const searchBox = page.locator(subj('streamsTable')).locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await page.waitForSelector(subj('streamsTable'));
    const expandAllButton = page.locator(STREAMS_EXPAND_ALL_BUTTON).first();
    const collapseAllButton = page.locator(STREAMS_COLLAPSE_ALL_BUTTON).first();

    if (await expandAllButton.isVisible().catch(() => false)) {
      await expandAllButton.click();
    } else {
      await collapseAllButton.waitFor({ state: 'visible', timeout: 60000 });
      await collapseAllButton.click();
      await expandAllButton.waitFor({ state: 'visible', timeout: 60000 });
      await expandAllButton.click();
    }

    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Collapse all streams', async ({ page }) => {
    const collapseAllButton = page.locator(STREAMS_COLLAPSE_ALL_BUTTON).first();
    await collapseAllButton.waitFor({ state: 'visible', timeout: 60000 });
    await collapseAllButton.click();
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Navigate to a stream detail page', async ({ page }) => {
    // After collapse-all, logs.child1 is hidden under the collapsed 'logs' parent.
    // Expand the 'logs' node first so the child link becomes visible.
    const logsExpandButton = page.locator(subj('expandButton-logs'));
    if (await logsExpandButton.isVisible().catch(() => false)) {
      await logsExpandButton.click();
    }
    const streamLink = page.locator(subj('streamsNameLink-logs.child1'));
    await streamLink.waitFor({ state: 'visible', timeout: 60000 });
    await streamLink.click();
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  });
