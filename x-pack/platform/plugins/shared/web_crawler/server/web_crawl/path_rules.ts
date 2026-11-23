/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEB_CRAWL_MAX_PATH_RULES, WEB_CRAWL_MAX_PATH_RULE_LENGTH } from '../../common/constants';

export interface PathRules {
  includePaths: string[];
  excludePaths: string[];
}

export const NO_PATH_RULES: PathRules = { includePaths: [], excludePaths: [] };

/** Trims and de-duplicates path prefixes, or returns `null` when one of them is not usable. */
export const normalizePathPrefixes = (paths: string[] = []): string[] | null => {
  const normalized = [...new Set(paths.map((path) => path.trim()).filter((path) => path !== ''))];
  const isValid =
    normalized.length <= WEB_CRAWL_MAX_PATH_RULES &&
    normalized.every(
      (path) => path.startsWith('/') && path.length <= WEB_CRAWL_MAX_PATH_RULE_LENGTH
    );
  return isValid ? normalized : null;
};

/** Whether the rules let the crawl follow a link. An excluded path wins over an included one. */
export const isPathAllowed = (url: string, { includePaths, excludePaths }: PathRules): boolean => {
  const { pathname } = new URL(url);
  if (excludePaths.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return includePaths.length === 0 || includePaths.some((prefix) => pathname.startsWith(prefix));
};
