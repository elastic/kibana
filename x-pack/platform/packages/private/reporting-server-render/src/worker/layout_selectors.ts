/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Copied from the screenshotting plugin's `DEFAULT_SELECTORS`
 * (`x-pack/platform/plugins/shared/screenshotting/server/layouts/index.ts`) rather than
 * imported, since that package isn't (and shouldn't become) a dependency of this one --
 * these selectors are a contract the *client-side* dashboard/visualize/canvas apps commit
 * to for any screenshotting consumer, not something private to the Chromium pipeline.
 */
export const LAYOUT_SELECTORS = {
  screenshot: '[data-shared-items-container]',
  renderComplete: '[data-shared-item]',
  renderError: '[data-render-error]',
  renderErrorAttribute: 'data-render-error',
  itemsCountAttribute: 'data-shared-items-count',
  timefilterDurationAttribute: 'data-shared-timefilter-duration',
} as const;
