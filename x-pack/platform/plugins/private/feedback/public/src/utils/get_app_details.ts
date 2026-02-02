/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

/**
 * Get current app details from execution context and nav links
 */
export const getAppDetails = (core: CoreStart) => {
  /**
   * Clear previous context to get the latest app info
   */
  core.executionContext.clear();

  const executionContext = core.executionContext.get();
  const navLinks = core.chrome.navLinks.getAll();

  /**
   * Try to match by url first (exact match)
   */
  let match = navLinks.find((link) => link.url === executionContext.url);

  /**
   * If no exact match, check if executionContext.url starts with any navLink.url then
   * sort the matches by URL length descending to get the most specific match first.
   * This handles cases where apps have sub-paths created by an navigation event within the app,
   * which causes the executionContext.url to contain that sub-path but navLink doesn't
   * e.g /app/slos/welcome (executionContext.url) vs /app/slos (navLink.url)
   */
  if (!match && executionContext.url) {
    const matches = navLinks
      .filter((link) => executionContext.url?.startsWith(link.url))
      .sort((a, b) => b.url.length - a.url.length);
    match = matches[0];
  }

  /**
   * Fallback to matching by name
   */
  if (!match) {
    match = navLinks.find((link) => link.id === executionContext.name);
  }

  let title = match?.title;
  const category = match?.category;

  if (category) {
    title = `[${category.label}] ${match?.title}`;
  }

  return {
    title: title ?? 'Kibana',
    id: match?.id ?? 'Kibana',
    url: executionContext.url,
  };
};
