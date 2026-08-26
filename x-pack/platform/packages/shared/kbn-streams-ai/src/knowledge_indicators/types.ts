/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, StreamQuery } from '@kbn/significant-events-schema';

export type SearchKnowledgeIndicatorsKind = 'feature' | 'query';

export interface SearchKnowledgeIndicatorsInput {
  /**
   * Optional: if omitted, search across all accessible streams.
   */
  stream_names?: string[];

  /**
   * Optional: free-text search (best-effort across stored fields).
   */
  search_text?: string;

  /**
   * What to return.
   * - ['query'] enables "queries-only KIs".
   * - default is empty array (or omitted), which returns everything.
   */
  kind?: SearchKnowledgeIndicatorsKind[];

  /**
   * Optional feature filters.
   */
  feature_types?: Array<Feature['type']>;
  feature_ids?: string[];

  /**
   * Optional query filters.
   */
  query_types?: Array<StreamQuery['type']>;
  query_ids?: string[];
  rule_ids?: string[];
  rule_backed?: boolean;

  /**
   * One-based result page and page size.
   */
  page?: number;
  per_page?: number;
}

export interface SearchKnowledgeIndicatorsOutput {
  knowledge_indicators: KnowledgeIndicator[];
  page: number;
  per_page: number;
  returned: number;
  total: number;
  has_more: boolean;
  next_page: number | null;
}

export type KnowledgeIndicator = KnowledgeIndicatorFeature | KnowledgeIndicatorQuery;

export interface KnowledgeIndicatorFeature {
  kind: 'feature';
  feature: Feature;
}

export interface KnowledgeIndicatorQuery {
  kind: 'query';
  query: StreamQuery;
  rule: {
    backed: boolean;
    id: string;
  };
  stream_name: string;
}
