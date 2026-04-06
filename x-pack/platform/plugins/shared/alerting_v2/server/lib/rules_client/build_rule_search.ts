/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeKuery } from '@kbn/es-query';
import { buildRuleSoFilter } from './build_rule_filter';

const normalizeSearchTerm = (term: string): string => {
  const normalized = term.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  return normalized || term;
};

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

export const buildFindRulesSearch = ({
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

  return combinedQuery ? buildRuleSoFilter(combinedQuery) : undefined;
};
