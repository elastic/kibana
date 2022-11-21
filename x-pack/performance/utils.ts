/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Page } from 'playwright';

export async function waitForChrome(page: Page) {
  return page.waitForSelector('.headerGlobalNav', { state: 'attached' });
}

export async function waitForVisualizations(page: Page, log: ToolingLog, visCount: number) {
  try {
    await page.waitForFunction(function renderCompleted(cnt) {
      const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
      const allVisLoaded = visualizations.length === cnt;
      return allVisLoaded
        ? visualizations.every((e) => e.getAttribute('data-render-complete') === 'true')
        : false;
    }, visCount);
  } catch (err) {
    const loadedVis = await page.$$('[data-rendering-count]');
    const renderedVis = await page.$$('[data-rendering-count][data-render-complete="true"]');
    log.error(
      `'waitForVisualizations' failed: loaded - ${loadedVis.length}, rendered - ${renderedVis.length}, expected - ${visCount}`
    );
    throw err;
  }
}
