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

const isActive = (ki: KnowledgeIndicator): boolean =>
  ki.kind === 'query' || !ki.feature.excluded_at;

export const matchesKnowledgeIndicatorFilters = (
  ki: KnowledgeIndicator,
  criteria: KnowledgeIndicatorFilterCriteria
): boolean => {
  const { statusFilter, selectedTypes, selectedStreams, hideComputedTypes, searchTerm } = criteria;

  if (statusFilter === 'active' && !isActive(ki)) return false;
  if (statusFilter === 'excluded' && isActive(ki)) return false;

  if (selectedTypes?.length) {
    const type = ki.kind === 'feature' ? ki.feature.type : 'query';
    if (!selectedTypes.includes(type)) return false;
  }

  if (selectedStreams?.length) {
    if (!selectedStreams.includes(getKnowledgeIndicatorStreamName(ki))) return false;
  }

  if (hideComputedTypes && ki.kind === 'feature' && isComputedFeature(ki.feature)) return false;

  if (searchTerm) {
    const title =
      ki.kind === 'feature'
        ? (ki.feature.title ?? '').toLowerCase()
        : (ki.query.title ?? '').toLowerCase();

    if (!title.includes(searchTerm)) return false;
  }

  return true;
};
