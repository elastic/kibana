/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { isCcsTarget } from '../utils/ccs';

export interface MatchResult {
  id: string;
  index: string;
  highlights: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

/**
 * Builds the search request body. For local indices, uses the RRF retriever
 * for best relevance ranking. For CCS targets, falls back to multi_match
 * because the simplified RRF retriever syntax does not support cross-cluster
 * index patterns.
 */
const buildSearchRequest = ({
  index,
  term,
  fields,
  size,
}: {
  index: string;
  term: string;
  fields: MappingField[];
  size: number;
}): Record<string, any> => {
  const highlightConfig = {
    number_of_fragments: 5,
    fragment_size: 500,
    pre_tags: [''],
    post_tags: [''],
    order: 'score' as const,
    fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
  };

  // CCS fallback: the simplified RRF retriever syntax does not support
  // cross-cluster index patterns, so we use a multi_match query instead.
  // semantic_text fields are excluded because multi_match does not support them.
  if (isCcsTarget(index)) {
    const multiMatchFields = fields.filter((f) => f.type !== 'semantic_text');
    if (multiMatchFields.length === 0) {
      throw new Error(
        `No multi_match-compatible fields available for CCS target "${index}". ` +
          'All searchable fields are semantic_text, which multi_match does not support.'
      );
    }

    const ccsHighlightConfig = {
      ...highlightConfig,
      fields: multiMatchFields.reduce(
        (memo, field) => ({ ...memo, [field.path]: {} }),
        {} as Record<string, Record<string, never>>
      ),
    };

    return {
      index,
      size,
      query: {
        multi_match: {
          query: term,
          fields: multiMatchFields.map((field) => field.path),
          type: 'best_fields',
        },
      },
      highlight: ccsHighlightConfig,
    };
  }

  // Local indices: use the RRF retriever for optimal relevance ranking
  // should replace `any` with `SearchRequest` type when the simplified retriever syntax is supported in @elastic/elasticsearch
  return {
    index,
    size,
    retriever: {
      rrf: {
        rank_window_size: size * 2,
        query: term,
        fields: fields.map((field) => field.path),
      },
    },
    highlight: highlightConfig,
  };
};

export const performMatchSearch = async ({
  term,
  fields,
  index,
  size,
  esClient,
  logger,
}: {
  term: string;
  fields: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<PerformMatchSearchResponse> => {
  const searchRequest = buildSearchRequest({ index, term, fields, size });

  logger.debug(`Elasticsearch search request: ${JSON.stringify(searchRequest, null, 2)}`);

  let response;
  try {
    response = await esClient.search<any>(searchRequest);
  } catch (error) {
    logger.debug(
      `Elasticsearch search failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }

  const results = response.hits.hits.map<MatchResult>((hit) => {
    return {
      id: hit._id!,
      index: hit._index!,
      highlights: Object.entries(hit.highlight ?? {}).reduce((acc, [field, highlights]) => {
        acc.push(...highlights);
        return acc;
      }, [] as string[]),
    };
  });

  return { results };
};
