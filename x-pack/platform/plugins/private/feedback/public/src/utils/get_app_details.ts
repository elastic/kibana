/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';

/**
 * Get current app details from browser URL and nav links.
 * Uses the actual browser URL for accurate deep link detection.
 */
export const getAppDetails = (core: CoreStart) => {
  const currentPath = window.location.pathname;
  const navLinks = core.chrome.navLinks.getAll();

  /**
   * Helper to get just the pathname from a navLink URL (strips hash and query string)
   * e.g., "/s/test/app/dashboards#/list" -> "/s/test/app/dashboards"
   */
  const getNavLinkPath = (url: string) => {
    return new URL(url, window.location.origin).pathname;
  };

  /**
   * Try to match by url first (exact match)
   */
  let match = navLinks.find((link) => getNavLinkPath(link.url) === currentPath);

  /**
   * If no exact match, check if currentPath starts with any navLink.url then
   * sort the matches by URL length descending to get the most specific match first.
   * This handles cases where apps have sub-paths created by a navigation event within the app,
   * which causes the currentPath to contain that sub-path but navLink doesn't
   * e.g /app/slos/welcome (currentPath) vs /app/slos (navLink.url)
   */
  if (!match) {
    const matches = navLinks
      .filter((link) => currentPath.startsWith(getNavLinkPath(link.url)))
      .sort((a, b) => getNavLinkPath(b.url).length - getNavLinkPath(a.url).length);
    match = matches[0];
  }

  let title = match?.title;
  const category = match?.category;

  if (category) {
    title = `${category.label} - ${match?.title}`;
  }

  return {
    title: title ?? 'Kibana',
    id: match?.id ?? 'Kibana',
    url: currentPath,
  };
};
