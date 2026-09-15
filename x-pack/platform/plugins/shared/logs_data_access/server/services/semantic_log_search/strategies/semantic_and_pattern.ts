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
import { buildSemanticSearchQuery, buildTemplateStatsQuery } from '../queries';
import { DEFAULT_MAX_PATTERNS } from '../constants';

interface TemplateStats {
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Extract template_id from a hit's fields (accessed via docvalue_fields).
 * pattern_text only exposes template_id (a hash), not the template text.
 */
function extractTemplateIdFromHit(hit: SearchHit, templateIdField: string): string | undefined {
  const fields = hit.fields as Record<string, unknown[]> | undefined;
  if (!fields) return undefined;
  const values = fields[templateIdField];
  if (Array.isArray(values) && values.length > 0) {
    return String(values[0]);
  }
  return undefined;
}

/**
 * Ladder 1: semantic_text + pattern_text
 *
 * TODO: Revisit this strategy for AI Index integration.
 * Consider using pattern_text extraction to populate KIs
 * instead of querying logs directly. Not used in current PoC.
 *
 * This is the primary path when both semantic_text and pattern_text are available:
 * 1. Semantic query with collapse on template_id
 * 2. Fetch counts and time bounds for the found templates
 */
export async function searchWithSemanticAndPattern(
  params: SemanticLogSearchParams,
  capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  const { esClient, target, nlQuery, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  const semanticField = capabilities.primarySemanticField!;
  const patternField = capabilities.primaryPatternField!;

  // Request 1: Semantic query with collapse, requesting template_id via docvalue_fields
  // pattern_text only exposes template_id (a hash), not the template text
  const searchQuery = buildSemanticSearchQuery({
    target,
    semanticField: semanticField.field,
    templateIdField: patternField.templateIdField,
    nlQuery,
    timeRange,
    size: maxPatterns,
  });

  // Add docvalue_fields to get template_id (it's not in _source)
  (searchQuery as Record<string, unknown>).docvalue_fields = [patternField.templateIdField];

  const searchResponse = await esClient.search(searchQuery);
  const hits = searchResponse.hits.hits;

  if (hits.length === 0) {
    return { patterns: [] };
  }

  // Extract unique template_ids and their sample docs
  const templateSamples = new Map<string, SearchHit>();
  for (const hit of hits) {
    const templateId = extractTemplateIdFromHit(hit, patternField.templateIdField);
    if (templateId && !templateSamples.has(templateId)) {
      templateSamples.set(templateId, hit);
    }
  }

  const templateIds = Array.from(templateSamples.keys());

  // If no templates were extracted, return empty
  if (templateIds.length === 0) {
    return { patterns: [] };
  }

  // Request 2: Get counts and time bounds using template_id
  const statsQuery = buildTemplateStatsQuery({
    target,
    templateField: patternField.templateIdField, // Use template_id, not template
    templateValues: templateIds,
    timeRange,
  });

  const statsResponse = await esClient.search(statsQuery);
  const templatesBuckets =
    (
      statsResponse.aggregations?.templates as {
        buckets: Array<{
          key: string;
          doc_count: number;
          first_seen: { value: number };
          last_seen: { value: number };
        }>;
      }
    )?.buckets ?? [];

  // Build stats map
  const statsMap = new Map<string, TemplateStats>();
  for (const bucket of templatesBuckets) {
    statsMap.set(bucket.key, {
      pattern: bucket.key,
      count: bucket.doc_count,
      firstSeen: new Date(bucket.first_seen.value).toISOString(),
      lastSeen: new Date(bucket.last_seen.value).toISOString(),
    });
  }

  // Combine into LogPattern results, preserving relevance order
  // pattern is the template_id hash; sample contains the human-readable message
  const patterns: LogPattern[] = [];
  for (const [templateId, sampleHit] of templateSamples) {
    const stats = statsMap.get(templateId);
    if (stats) {
      patterns.push({
        field: patternField.field,
        pattern: templateId, // This is the hash, used for expand
        count: stats.count,
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen,
        sample: {
          _id: sampleHit._id,
          _index: sampleHit._index,
          ...(sampleHit._source as Record<string, unknown>),
        },
      });
    }
  }

  return { patterns };
}
