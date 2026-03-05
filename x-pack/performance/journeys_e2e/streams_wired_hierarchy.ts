/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { setupLargeWiredHierarchy } from '../synthtrace_data/streams_data';

const STREAMS_SEARCH_SELECTOR = 'input[aria-label="Search streams by name"]';
const STREAMS_EXPAND_ALL_BUTTON = subj('streamsExpandAllButton');
const STREAMS_COLLAPSE_ALL_BUTTON = subj('streamsCollapseAllButton');
const WIRED_CHILD_FIRST = subj('streamsNameLink-logs.otel.perf_child_0001');
const WIRED_CHILD_MIDDLE = subj('streamsNameLink-logs.otel.perf_child_0050');
const WIRED_HIERARCHY_COUNT = 1000;
const WIRED_HIERARCHY_STRATEGY = 'import' as const;

export const journey = new Journey({
  ftrConfigPath: 'x-pack/performance/configs/streams_heavy_config.ts',
  beforeSteps: async ({ kibanaServer, es, log }) => {
    await setupLargeWiredHierarchy(kibanaServer, es, log, {
      count: WIRED_HIERARCHY_COUNT,
      strategy: WIRED_HIERARCHY_STRATEGY,
    });
  },
})
  .step('Go to Streams listing page', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams'));
    await page.waitForSelector(subj('streamsTable'), { timeout: 120000 });
  })
  .step('Expand all streams to reveal wired children', async ({ page }) => {
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

    await page.waitForSelector(WIRED_CHILD_FIRST, { timeout: 60000 });
  })
  .step('Search for a wired child stream', async ({ page, inputDelays }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await searchBox.type('logs.otel.perf_child_0050', { delay: inputDelays.TYPING });
    await page.waitForSelector(WIRED_CHILD_MIDDLE, { timeout: 60000 });
  })
  .step('Clear search', async ({ page }) => {
    const searchBox = page.locator(STREAMS_SEARCH_SELECTOR).first();
    await searchBox.waitFor({ state: 'visible', timeout: 60000 });
    await searchBox.fill('');
    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Collapse all streams', async ({ page }) => {
    const collapseAllButton = page.locator(STREAMS_COLLAPSE_ALL_BUTTON).first();
    const expandAllButton = page.locator(STREAMS_EXPAND_ALL_BUTTON).first();

    if (await collapseAllButton.isVisible().catch(() => false)) {
      await collapseAllButton.click();
    } else {
      // Already collapsed; keep this step idempotent to reduce UI-state flakes.
      await expandAllButton.waitFor({ state: 'visible', timeout: 60000 });
    }

    await page.waitForSelector(subj('streamsTable'));
  })
  .step('Navigate to a wired child detail page', async ({ page }) => {
    const logsExpandButton = page.locator(subj('expandButton-logs.otel'));
    if (await logsExpandButton.isVisible().catch(() => false)) {
      await logsExpandButton.click();
    }
    const streamLink = page.locator(subj('streamsNameLink-logs.otel.perf_child_0001'));
    await streamLink.waitFor({ state: 'visible', timeout: 60000 });
    await streamLink.click();
    await page.waitForSelector(subj('wiredStreamBadge'), { timeout: 60000 });
  })
  .step('Navigate to root stream partitioning tab', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/streams/logs.otel/management/partitioning'));
    await page.waitForSelector(subj('streamsAppStreamDetailRoutingAddRuleButton'), {
      timeout: 120000,
    });
  })
  .step('Verify routing rules render at scale', async ({ page }) => {
    await page.waitForSelector(subj('routingRule-logs.otel.perf_child_0001'), {
      timeout: 60000,
    });
  });
