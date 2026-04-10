/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { useEffect, useMemo } from 'react';
import { getKnowledgeIndicatorItemId } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_item_id';
import { getKnowledgeIndicatorStreamName } from '../../../stream_detail_significant_events_view/utils/get_knowledge_indicator_stream_name';
import { matchesKnowledgeIndicatorFilters } from '../../../stream_detail_significant_events_view/utils/matches_knowledge_indicator_filters';

export const getKnowledgeIndicatorTitle = (ki: KnowledgeIndicator): string =>
  ki.kind === 'feature' ? ki.feature.title ?? ki.feature.id : ki.query.title ?? ki.query.id;

interface UseKnowledgeIndicatorsStateSyncParams {
  knowledgeIndicators: KnowledgeIndicator[];
  statusFilter: 'active' | 'excluded';
  selectedTypes: string[];
  selectedStreams: string[];
  hideComputedTypes: boolean;
  debouncedSearchTerm: string;
  setSelectedKnowledgeIndicator: React.Dispatch<React.SetStateAction<KnowledgeIndicator | null>>;
  setSelectedKnowledgeIndicators: React.Dispatch<React.SetStateAction<KnowledgeIndicator[]>>;
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedStreams: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * Keeps selection and filter state in sync with the source KI data.
 *
 * When the underlying `knowledgeIndicators` array changes (e.g. after a delete
 * or a refetch), stale items are pruned from both the flyout selection and the
 * checkbox selection. Filter options that no longer match any KIs under the
 * current cross-filter combination are also pruned.
 *
 * Returns the filtered and sorted list of KIs ready for table rendering.
 */
export function useKnowledgeIndicatorsStateSync({
  knowledgeIndicators,
  statusFilter,
  selectedTypes,
  selectedStreams,
  hideComputedTypes,
  debouncedSearchTerm,
  setSelectedKnowledgeIndicator,
  setSelectedKnowledgeIndicators,
  setSelectedTypes,
  setSelectedStreams,
}: UseKnowledgeIndicatorsStateSyncParams): KnowledgeIndicator[] {
  // Prune flyout and checkbox selections when items disappear from the data
  // (e.g. after deletion or external refetch). Only depends on the raw data
  // array — filter changes don't invalidate selections.
  useEffect(() => {
    const validIds = new Set(knowledgeIndicators.map(getKnowledgeIndicatorItemId));

    setSelectedKnowledgeIndicator((current) => {
      if (!current) return current;
      return validIds.has(getKnowledgeIndicatorItemId(current)) ? current : null;
    });

    setSelectedKnowledgeIndicators((current) => {
      const pruned = current.filter((ki) => validIds.has(getKnowledgeIndicatorItemId(ki)));
      return pruned.length === current.length ? current : pruned;
    });
  }, [knowledgeIndicators, setSelectedKnowledgeIndicator, setSelectedKnowledgeIndicators]);

  // Cross-filter pruning: when one filter changes, the other filters' selected
  // values may no longer have any matching KIs. For example, if the user selects
  // type "keyword" and stream "logs", then changes status to "excluded" where no
  // "keyword" KIs exist, the type filter should drop "keyword" automatically.
  // Each filter dimension is computed independently of its own current selection
  // but *with* the other filters applied.
  useEffect(() => {
    const availableTypes = new Set<string>();
    const availableStreams = new Set<string>();

    for (const ki of knowledgeIndicators) {
      if (
        matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedStreams,
          hideComputedTypes,
        })
      ) {
        availableTypes.add(ki.kind === 'feature' ? ki.feature.type : 'query');
      }
      if (
        matchesKnowledgeIndicatorFilters(ki, {
          statusFilter,
          selectedTypes,
          hideComputedTypes,
        })
      ) {
        availableStreams.add(getKnowledgeIndicatorStreamName(ki));
      }
    }

    setSelectedTypes((current) => {
      const pruned = current.filter((t) => availableTypes.has(t));
      return pruned.length === current.length ? current : pruned;
    });
    setSelectedStreams((current) => {
      const pruned = current.filter((s) => availableStreams.has(s));
      return pruned.length === current.length ? current : pruned;
    });
  }, [
    knowledgeIndicators,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
    setSelectedTypes,
    setSelectedStreams,
  ]);

  return useMemo(() => {
    const filtered = knowledgeIndicators.filter((ki) =>
      matchesKnowledgeIndicatorFilters(ki, {
        statusFilter,
        selectedTypes,
        selectedStreams,
        hideComputedTypes,
        searchTerm: debouncedSearchTerm,
      })
    );

    return filtered.sort((a, b) =>
      getKnowledgeIndicatorTitle(a)
        .toLowerCase()
        .localeCompare(getKnowledgeIndicatorTitle(b).toLowerCase())
    );
  }, [
    knowledgeIndicators,
    debouncedSearchTerm,
    statusFilter,
    selectedTypes,
    selectedStreams,
    hideComputedTypes,
  ]);
}
