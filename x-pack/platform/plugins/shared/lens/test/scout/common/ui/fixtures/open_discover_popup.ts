/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverApp, extendPlaywrightPage, type KibanaUrl, type ScoutPage } from '@kbn/scout';
import type { PlaywrightPage } from './helpers';

/**
 * Clicks a control that opens Discover in a new tab and returns that tab as a Scout page.
 * Caller must close the returned page (use `try`/`finally`).
 */
export async function openDiscoverFromPopup(options: {
  context: {
    waitForEvent: (event: 'page') => Promise<PlaywrightPage>;
  };
  kbnUrl: KibanaUrl;
  click: () => Promise<void>;
}): Promise<ScoutPage> {
  const { context, kbnUrl, click } = options;
  const discoverPagePromise = context.waitForEvent('page');
  await click();
  const discoverPage = extendPlaywrightPage({
    page: await discoverPagePromise,
    kbnUrl,
  });
  // Discover first paint in a new tab can exceed the default 10s wait.
  await discoverPage.testSubj.locator('dscPage').waitFor({ state: 'visible', timeout: 30_000 });
  await new DiscoverApp(discoverPage).waitUntilSearchingHasFinished();
  return discoverPage;
}
