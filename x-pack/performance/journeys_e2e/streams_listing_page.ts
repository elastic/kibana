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
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
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
    await searchBox.type('logs-perf-classic-00001', {
      delay: inputDelays.TYPING,
      timeout: 120000,
    });
    await page.waitForSelector(subj('streamsTable'), { timeout: 60000 });
  })
  .step('Clear search and expand all streams', async ({ page }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
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
  .step('Navigate to a stream detail page', async ({ page, inputDelays }) => {
    // logs.otel can be paginated away. Filter to bring it into view.
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await searchBox.type('logs.otel', {
      delay: inputDelays.TYPING,
      timeout: 60000,
    });

    const logsOtelExpand = page.locator(subj('expandButton-logs.otel'));
    await logsOtelExpand.waitFor({ state: 'visible', timeout: 120000 });
    await logsOtelExpand.click();

    const streamLink = page.locator(subj('streamsNameLink-logs.otel.child1'));
    await streamLink.waitFor({ state: 'visible', timeout: 60000 });
    await streamLink.click();
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  });
