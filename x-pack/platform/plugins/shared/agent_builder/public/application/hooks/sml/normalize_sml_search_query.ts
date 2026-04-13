/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SML_HTTP_SEARCH_QUERY_MAX_LENGTH } from '../../../../common/http_api/sml';

/**
 * Normalizes the debounced raw query for SML search API and react-query keys.
 * Whitespace-only input becomes a wildcard so the menu can load default matches.
 * Length is capped to match the internal HTTP route.
 */
export const normalizeSmlSearchQuery = (debouncedQuery: string): string => {
  const trimmed = debouncedQuery.trim();
  const base = trimmed.length > 0 ? trimmed : '*';
  if (base.length <= SML_HTTP_SEARCH_QUERY_MAX_LENGTH) {
    return base;
  }
  return base.slice(0, SML_HTTP_SEARCH_QUERY_MAX_LENGTH);
};
