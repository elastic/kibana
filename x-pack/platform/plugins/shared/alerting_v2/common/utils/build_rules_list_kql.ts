/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';

const normalizeSearchTerm = (term: string): string => {
  const normalized = term.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  return normalized || term;
};

/**
 * KQL fragment for free-text search (same shape as list-rules `search` handling).
 */
export const buildRuleSearchQuery = (search?: string): string | undefined => {
  if (!search?.trim()) {
    return undefined;
  }

  const termFilters = search
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => {
      const escapedTerm = escapeKuery(normalizeSearchTerm(term));
      return `(metadata.name: ${escapedTerm}* OR metadata.tags: ${escapedTerm}*)`;
    });

  return termFilters.length > 0 ? termFilters.join(' AND ') : undefined;
};

/**
 * API-level KQL combining structural `filter` and `search`, matching server
 * `buildFindRulesSearch` before saved-object field rewriting.
 */
export const buildApiRulesListCombinedFilter = ({
  filter: existingFilter,
  search,
}: {
  filter?: string;
  search?: string;
}): string | undefined => {
  const searchQuery = buildRuleSearchQuery(search);
  const combinedQuery =
    existingFilter && searchQuery
      ? `(${existingFilter}) AND (${searchQuery})`
      : existingFilter ?? searchQuery;

  return combinedQuery || undefined;
};
