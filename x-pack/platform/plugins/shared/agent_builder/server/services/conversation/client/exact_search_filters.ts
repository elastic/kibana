/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ConversationSearchFilters } from './types';

export const buildConversationExactSearchFilters = (
  filters?: ConversationSearchFilters
): QueryDslQueryContainer[] => {
  if (!filters) {
    return [];
  }

  const clauses: QueryDslQueryContainer[] = [];
  const { template, extendedFields } = filters;

  if (template?.id) {
    clauses.push({ term: { 'template.id': template.id } });
  }

  if (template?.version !== undefined) {
    clauses.push({ term: { 'template.version': template.version } });
  }

  for (const filter of extendedFields ?? []) {
    const field = `extended_fields.${filter.key}`;

    if (filter.exists) {
      clauses.push({ exists: { field } });
    }

    if (filter.value !== undefined) {
      clauses.push({ term: { [field]: filter.value } });
    }
  }

  return clauses;
};
