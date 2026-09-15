/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type {
  SemanticLogSearchParams,
  SemanticLogSearchResult,
  LogPattern,
} from '../../../../common/services/semantic_log_search/types';
import type { TargetCapabilities } from '../capabilities';
import { buildSemanticSearchQueryNoCollapse, buildCategorizeTextQuery } from '../queries';
import { DEFAULT_MAX_PATTERNS } from '../constants';

/**
 * Ladder 2: semantic_text only
 *
 * TODO: Revisit this strategy for AI Index integration.
 * Consider using pattern_text extraction to populate KIs
 * instead of querying logs directly. Not used in current PoC.
 *
 * This path is used when semantic_text is available but pattern_text is not:
 * 1. Semantic query (no collapse)
 * 2. Categorize_text aggregation on the results to find patterns
 */
export async function searchWithSemanticOnly(
  params: SemanticLogSearchParams,
  capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  const { esClient, target, nlQuery, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  const semanticField = capabilities.primarySemanticField!;
  // Use 'message' as the categorization field if available
  const categorizationField =
    capabilities.fields.find((f) => f.path === 'message' && f.type === 'text')?.path ?? 'message';

  // Run semantic search to get relevant documents
  const searchQuery = buildSemanticSearchQueryNoCollapse({
    target,
    semanticField: semanticField.field,
    nlQuery,
    timeRange,
    size: maxPatterns * 10, // Get more docs to have enough for categorization
  });

  const searchResponse = await esClient.search(searchQuery);

  if (searchResponse.hits.hits.length === 0) {
    return { patterns: [] };
  }

  // Run categorize_text to find patterns
  const categorizeQuery = buildCategorizeTextQuery({
    target,
    field: categorizationField,
    timeRange,
    maxPatterns,
  });

  const categorizeResponse = await esClient.search(categorizeQuery);
  const patternBuckets =
    (
      categorizeResponse.aggregations?.patterns as {
        buckets: Array<{
          key: string;
          doc_count: number;
          first_seen: { value: number };
          last_seen: { value: number };
          sample: { hits: { hits: SearchHit[] } };
        }>;
      }
    )?.buckets ?? [];

  const patterns: LogPattern[] = patternBuckets.map((bucket) => {
    const sampleHit = bucket.sample.hits.hits[0];
    return {
      field: categorizationField,
      pattern: bucket.key,
      count: bucket.doc_count,
      firstSeen: new Date(bucket.first_seen.value).toISOString(),
      lastSeen: new Date(bucket.last_seen.value).toISOString(),
      sample: {
        _id: sampleHit?._id,
        _index: sampleHit?._index,
        ...(sampleHit?._source as Record<string, unknown>),
      },
    };
  });

  return { patterns };
}
