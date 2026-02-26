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
 * for best relevance ranking. For CCS targets, falls back to a query-based
 * approach because the simplified RRF retriever syntax does not support
 * cross-cluster index patterns.
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
  // cross-cluster index patterns, so we use a query-based approach instead.
  if (isCcsTarget(index)) {
    return {
      index,
      size,
      query: buildCcsQuery({ term, fields }),
      highlight: highlightConfig,
    };
  }

  // Local indices: use the RRF retriever for optimal relevance ranking
  // TODO: once multi_match supports semantic_text (elastic/search-team#11226),
  // consider unifying local and CCS paths.
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

/**
 * Builds the query for a CCS target using a bool/should with one match clause
 * per searchable field.
 *
 * We cannot use multi_match here because it does not support semantic_text
 * fields (elastic/search-team#11226), and _field_caps (our mapping source for
 * CCS) reports semantic_text fields as "text", making them indistinguishable.
 * Individual match queries work correctly with both regular text and
 * semantic_text fields.
 */
const buildCcsQuery = ({
  term,
  fields,
}: {
  term: string;
  fields: MappingField[];
}): Record<string, unknown> => {
  return {
    bool: {
      should: fields.map((f) => ({ match: { [f.path]: term } })),
      minimum_should_match: 1,
    },
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
