/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { buildPhraseFilter, type Filter } from '@kbn/es-query';
import type { EpisodesFilterState } from './build_episodes_esql_query';

/**
 * Converts EpisodesFilterState into an array of ES filters to be passed via kibana_context.
 * These filters will be applied by the ES|QL query execution.
 * Includes kuery (textual query) as a query filter.
 */
export function buildEpisodesFilters(
  filterState: EpisodesFilterState | undefined,
  dataView: DataView
): Filter[] {
  if (!filterState) {
    return [];
  }

  const filters: Filter[] = [];

  // Status filter (single value)
  if (filterState.status) {
    const statusField = dataView.getFieldByName('episode.status');
    if (statusField) {
      filters.push(buildPhraseFilter(statusField, filterState.status, dataView));
    }
  }

  // Rule ID filter (single value)
  if (filterState.ruleId) {
    const ruleIdField = dataView.getFieldByName('rule.id');
    if (ruleIdField) {
      filters.push(buildPhraseFilter(ruleIdField, filterState.ruleId, dataView));
    }
  }

  // Kuery (textual query) as a filter
  if (filterState.kuery?.trim()) {
    filters.push({
      meta: {
        index: dataView.id,
        alias: null,
        disabled: false,
        negate: false,
      },
      query: {
        query_string: {
          query: filterState.kuery.trim(),
        },
      },
    });
  }

  return filters;
}
