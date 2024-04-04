/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import type { Query, AggregateQuery, Filter } from '@kbn/es-query';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

export interface EmbeddableLogCategorizationProps<T = Query | AggregateQuery> {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: T;
  filters?: Filter[];
  id?: string;
  embeddingOrigin?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: () => void;
  setPatternCount: (patternCount: number | undefined) => void;
  setOptionsMenu: (optionsMenu: React.ReactElement | undefined) => void;
}

export type EmbeddableLogCategorizationInput = EmbeddableInput & EmbeddableLogCategorizationProps;

export type EmbeddableLogCategorizationOutput = EmbeddableOutput & { indexPatterns?: DataView[] };

export const EMBEDDABLE_LOG_CATEGORIZATION_TYPE = 'aiopsLogCategorization' as const;

export type EmbeddableLogCategorizationType = typeof EMBEDDABLE_LOG_CATEGORIZATION_TYPE;
