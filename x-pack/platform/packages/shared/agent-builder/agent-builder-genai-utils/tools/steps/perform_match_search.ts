/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import type { MappingField } from '../utils/mappings';
import { isCcsTarget } from '../utils/ccs';
import { MAX_ES_RESPONSE_SIZE_BYTES } from '../constants';
import { extractSnippetsBatch, type TopSnippetsConfig } from './extract_snippets';

export interface MatchResult {
  id: string;
  index: string;
  snippets: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

/**
 * Builds a knn retriever for a dense_vector field using the query_vector_builder.
 * The model_id corresponds to the inference_id from the field mapping.
 */
const buildKnnRetriever = ({
  field,
  term,
  size,
}: {
  field: MappingField;
  term: string;
  size: number;
}): Record<string, unknown> => ({
  knn: {
    field: field.path,
    query_vector_builder: {
      text_embedding: {
        model_id: field.inferenceId!,
        model_text: term,
      },
    },
    k: size,
    num_candidates: size * 10,
  },
});

/**
 * Builds the search request body. For local indices, uses the RRF retriever
 * for best relevance ranking. For CCS targets, falls back to a query-based
 * approach because the simplified RRF retriever syntax does not support
 * cross-cluster index patterns.
 *
 * When `useTopSnippets` is true, highlighting is omitted from the request
 * because snippets will be extracted via a separate ES|QL TOP_SNIPPETS call.
 */
const buildSearchRequest = ({
  index,
  term,
  fields,
  denseVectorFields,
  size,
  useTopSnippets,
}: {
  index: string;
  term: string;
  fields: MappingField[];
  denseVectorFields: MappingField[];
  size: number;
  useTopSnippets: boolean;
}): Record<string, any> => {
  // Highlighting only applies to text fields, not dense_vector fields
  const highlightConfig = useTopSnippets
    ? {}
    : fields.length > 0
    ? {
        highlight: {
          number_of_fragments: 5,
          fragment_size: 500,
          pre_tags: [''],
          post_tags: [''],
          order: 'score' as const,
          fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
        },
      }
    : {};

  // CCS fallback: the simplified RRF retriever syntax does not support
  // cross-cluster index patterns, so we use a query-based approach instead.
  // NOTE: dense_vector fields with inference_id are not supported for CCS targets
  // because the _field_caps API does not expose inference_id.
  if (isCcsTarget(index)) {
    return {
      index,
      size,
      query: buildCcsQuery({ term, fields }),
      ...highlightConfig,
    };
  }

  // Local indices: use the RRF retriever for optimal relevance ranking
  // TODO: once multi_match supports semantic_text (elastic/search-team#11226),
  // consider unifying local and CCS paths.
  // should replace `any` with `SearchRequest` type when the simplified retriever syntax is supported in @elastic/elasticsearch
  const knnRetrievers = denseVectorFields.map((field) => buildKnnRetriever({ field, term, size }));

  const retrievers: Array<Record<string, unknown>> = [...knnRetrievers];

  // Only include the text fields retriever if there are text fields to search
  if (fields.length > 0) {
    retrievers.push({
      rrf: {
        query: term,
        fields: fields.map((field) => field.path),
      },
    });
  }

  return {
    index,
    size,
    retriever: {
      rrf: {
        rank_window_size: size * 2,
        retrievers,
      },
    },
    ...highlightConfig,
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
  denseVectorFields = [],
  index,
  size,
  esClient,
  logger,
  topSnippetsConfig,
}: {
  term: string;
  fields: MappingField[];
  denseVectorFields?: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
  logger: Logger;
  /** When provided, snippets are extracted via ES|QL TOP_SNIPPETS instead of ES highlighting. */
  topSnippetsConfig?: TopSnippetsConfig;
}): Promise<PerformMatchSearchResponse> => {
  const useTopSnippets = topSnippetsConfig != null;
  const searchRequest = buildSearchRequest({
    index,
    term,
    fields,
    denseVectorFields,
    size,
    useTopSnippets,
  });

  logger.debug(`Elasticsearch search request: ${JSON.stringify(searchRequest, null, 2)}`);

  let response;
  try {
    response = await esClient.search<any>(searchRequest, {
      maxResponseSize: MAX_ES_RESPONSE_SIZE_BYTES,
    });
  } catch (error) {
    if (isMaximumResponseSizeExceededError(error)) {
      throw new Error(
        `Search response exceeded the maximum allowed size of 20MB. ` +
          `Try reducing the result size or narrowing the query.`
      );
    }
    logger.debug(
      `Elasticsearch search failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }

  const hits = response.hits.hits;

  if (!useTopSnippets) {
    // Fallback: extract snippets from Elasticsearch highlighting
    const results = hits.map<MatchResult>((hit) => ({
      id: hit._id!,
      index: hit._index!,
      snippets: Object.entries(hit.highlight ?? {}).reduce((acc, [, fragments]) => {
        acc.push(...fragments);
        return acc;
      }, [] as string[]),
    }));
    return { results };
  }

  // TOP_SNIPPETS path: one ES|QL call for the entire result set
  const docIds = hits.map((hit) => hit._id!);
  const snippetsByDocId = await extractSnippetsBatch({
    index,
    docIds,
    term,
    fields,
    config: topSnippetsConfig,
    esClient,
    logger,
  });

  const results = hits.map<MatchResult>((hit) => ({
    id: hit._id!,
    index: hit._index!,
    snippets: snippetsByDocId.get(hit._id!) ?? [],
  }));

  return { results };
};
