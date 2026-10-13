/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';

/**
 * The single matcher representation: a matcher constraining nothing is no matcher, so `{}`, an
 * empty `tags` and a blank `expression` all read as the catch-all that omitting `matcher` means.
 */
export const normalizeMatcher = (
  matcher?: { tags?: string[] | null; expression?: string | null } | null
): PolicyMatcher | undefined => {
  const tags = matcher?.tags?.length ? matcher.tags : undefined;
  const expression = matcher?.expression?.trim() || undefined;

  if (!tags && !expression) return undefined;

  return { ...(tags ? { tags } : {}), ...(expression ? { expression } : {}) };
};
