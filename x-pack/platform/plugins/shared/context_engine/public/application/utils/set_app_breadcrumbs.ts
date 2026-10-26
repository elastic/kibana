/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, ChromeStart, ChromeStyle } from '@kbn/core-chrome-browser';

export const setAppBreadcrumbsViaCore = (
  chrome: ChromeStart,
  chromeStyle: ChromeStyle,
  breadcrumbs: ChromeBreadcrumb[]
): void => {
  if (chromeStyle === 'project') {
    chrome.setBreadcrumbs([], { project: { value: breadcrumbs } });
  } else {
    chrome.setBreadcrumbs(breadcrumbs);
  }
};

export const clearAppBreadcrumbsViaCore = (chrome: ChromeStart): void => {
  chrome.setBreadcrumbs([], { project: { value: [] } });
};
