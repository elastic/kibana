/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from 'playwright';

export async function waitForChrome(page: Page) {
  return page.waitForSelector('.headerGlobalNav', { state: 'attached' });
}

export async function waitForVisualizations(page: Page, visCount: number) {
  return await page.waitForFunction(function renderCompleted(cnt) {
    const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
    const visualizationElementsLoaded = visualizations.length === cnt;
    const visualizationAnimationsFinished = visualizations.every(
      (e) => e.getAttribute('data-render-complete') === 'true'
    );
    return visualizationElementsLoaded && visualizationAnimationsFinished;
  }, visCount);
}
