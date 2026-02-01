/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripQueryParams } from '@kbn/core-chrome-browser-internal/src/project_navigation/utils';
import type { CoreStart } from '@kbn/core/public';

const stripHashAndQueryParams = (url: string) => {
  // Strip hash first (navLink URLs don't include hashes)
  const hashIndex = url.indexOf('#');
  const withoutHash = hashIndex !== -1 ? url.slice(0, hashIndex) : url;
  return stripQueryParams(withoutHash);
};

export const getCurrentAppTitle = (core: CoreStart): string | undefined => {
  let location: string | undefined;

  core.application.currentLocation$.subscribe((loc) => (location = loc)).unsubscribe();

  if (!location) {
    return undefined;
  }

  const navLinks = core.chrome.navLinks.getAll();
  // NavLink URLs don't include hashes, so strip hash from location for matching
  const locationSanitized = stripHashAndQueryParams(location);

  // Same matching logic as findActiveNodes: group by URL path length, then sort by ID depth
  const matches: Array<Array<(typeof navLinks)[number]>> = [];

  for (const link of navLinks) {
    const linkPath = stripHashAndQueryParams(core.http.basePath.remove(link.url));
    if (locationSanitized.startsWith(linkPath)) {
      const { length } = linkPath;
      if (!matches[length]) {
        matches[length] = [];
      }
      matches[length].push(link);
      // Sort by ID length (deeper nesting = more colons = longer ID)
      matches[length].sort((a, b) => b.id.length - a.id.length);
    }
  }

  // Pick the longest URL match, then the deepest nested link
  const matchingLink = matches.length > 0 ? matches[matches.length - 1]?.[0] : undefined;

  if (!matchingLink?.title) {
    return undefined;
  }

  const category = matchingLink.category;
  if (category && category.id !== 'kibana' && category.id !== 'management') {
    return `[${category.label}] ${matchingLink.title}`;
  }

  return matchingLink.title;
};
