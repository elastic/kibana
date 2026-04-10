/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { isComputedFeature } from '@kbn/streams-schema';
import { getKnowledgeIndicatorStreamName } from './get_knowledge_indicator_stream_name';

export interface KnowledgeIndicatorFilterCriteria {
  statusFilter?: 'active' | 'excluded';
  selectedTypes?: string[];
  selectedStreams?: string[];
  hideComputedTypes?: boolean;
  searchTerm?: string;
}

export const matchesKnowledgeIndicatorFilters = (
  ki: KnowledgeIndicator,
  criteria: KnowledgeIndicatorFilterCriteria
): boolean => {
  const { statusFilter, selectedTypes, selectedStreams, hideComputedTypes, searchTerm } = criteria;

  if (statusFilter !== undefined) {
    const matchesStatus =
      statusFilter === 'active'
        ? ki.kind === 'query' || !ki.feature.excluded_at
        : ki.kind === 'feature' && Boolean(ki.feature.excluded_at);

    if (!matchesStatus) {
      return false;
    }
  }

  if (selectedTypes !== undefined && selectedTypes.length > 0) {
    const type = ki.kind === 'feature' ? ki.feature.type : 'query';
    if (!selectedTypes.includes(type)) {
      return false;
    }
  }

  if (selectedStreams !== undefined && selectedStreams.length > 0) {
    if (!selectedStreams.includes(getKnowledgeIndicatorStreamName(ki))) {
      return false;
    }
  }

  if (hideComputedTypes && ki.kind === 'feature' && isComputedFeature(ki.feature)) {
    return false;
  }

  if (searchTerm !== undefined) {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (normalizedSearchTerm) {
      const title =
        ki.kind === 'feature'
          ? (ki.feature.title ?? '').toLowerCase()
          : (ki.query.title ?? '').toLowerCase();

      if (!title.includes(normalizedSearchTerm)) {
        return false;
      }
    }
  }

  return true;
};
