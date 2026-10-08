/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  AI_INSIGHTS_MAX_DATA_SOURCES,
  AI_INSIGHTS_MAX_KEYWORD_FIELDS,
  AI_INSIGHTS_MAX_NUMERIC_FIELDS,
} from '../../../common/ai_insights/constants';
import type {
  AiInsightsDataSource,
  AiInsightsSearchQuery,
} from '../../../common/ai_insights/types';
import { buildPrefetchQuery } from './build_prefetch_query';

export interface PrefetchedDataSourceMetrics {
  index_pattern: string;
  title: string;
  time_field?: string;
  doc_count?: number;
  top_terms?: Record<string, Array<{ key: string; doc_count: number }>>;
  numeric_stats?: Record<string, { avg?: number | null; min?: number | null; max?: number | null }>;
  error?: string;
}

const SKIP_FIELD_NAMES = new Set([
  '_id',
  '_index',
  '_score',
  'id',
  'uuid',
  'message',
  'event.original',
]);

const ID_LIKE_SUFFIX = /(^|[._])(id|ids|uuid|guid|hash|token|key)$/i;
const HIGH_CARDINALITY_HINT = /(num|number|code|url|path|host\.name|user\.name)$/i;
const USEFUL_NUMERIC_HINT =
  /(delay|duration|latency|rtt|price|cost|bytes|count|rate|error|fail|cpu|memory|usage|score|time|distance|size|qty|quantity|amount|value|total)/i;
const USEFUL_CATEGORY_HINT =
  /(status|state|type|result|severity|level|category|outcome|reason|region|country|city|service|name|env|environment|provider|method|code|agent|host|container|cloud)/i;

function isUsefulFieldName(name: string): boolean {
  if (!name || SKIP_FIELD_NAMES.has(name) || name.startsWith('_')) {
    return false;
  }
  // Prefer human-facing fields over deeply nested technical ones.
  return name.split('.').length <= 3;
}

function scoreKeywordField(name: string): number {
  let score = 0;
  if (USEFUL_CATEGORY_HINT.test(name)) score += 8;
  if (ID_LIKE_SUFFIX.test(name) || HIGH_CARDINALITY_HINT.test(name)) score -= 6;
  if (name.toLowerCase().includes('airport')) score -= 2;
  // Prefer shorter, flatter names.
  score -= Math.min(name.length, 40) / 20;
  score -= (name.split('.').length - 1) * 1.5;
  return score;
}

function scoreNumericField(name: string): number {
  let score = 0;
  if (USEFUL_NUMERIC_HINT.test(name)) score += 8;
  if (ID_LIKE_SUFFIX.test(name) || /dayofweek|hourofday|minute|second/i.test(name)) score -= 5;
  score -= Math.min(name.length, 40) / 20;
  score -= (name.split('.').length - 1) * 1.5;
  return score;
}

async function pickFields({
  esClient,
  indexPattern,
}: {
  esClient: ElasticsearchClient;
  indexPattern: string;
}): Promise<{ keywordFields: string[]; numericFields: string[] }> {
  const caps = await esClient.fieldCaps({
    index: indexPattern,
    fields: '*',
    include_unmapped: false,
  });

  const keywordCandidates: Array<{ name: string; score: number }> = [];
  const numericCandidates: Array<{ name: string; score: number }> = [];

  for (const [fieldName, types] of Object.entries(caps.fields ?? {})) {
    if (!isUsefulFieldName(fieldName)) {
      continue;
    }
    const typeNames = Object.keys(types);
    if (typeNames.includes('keyword') || typeNames.includes('boolean')) {
      keywordCandidates.push({ name: fieldName, score: scoreKeywordField(fieldName) });
    }
    if (
      typeNames.some((type) =>
        [
          'long',
          'integer',
          'short',
          'byte',
          'double',
          'float',
          'half_float',
          'scaled_float',
        ].includes(type)
      )
    ) {
      numericCandidates.push({ name: fieldName, score: scoreNumericField(fieldName) });
    }
  }

  keywordCandidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  numericCandidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    keywordFields: keywordCandidates.slice(0, AI_INSIGHTS_MAX_KEYWORD_FIELDS).map((f) => f.name),
    numericFields: numericCandidates.slice(0, AI_INSIGHTS_MAX_NUMERIC_FIELDS).map((f) => f.name),
  };
}

export async function prefetchDataSourceMetrics({
  esClient,
  dataSources,
  timeRange,
  searchQuery,
  filters,
  logger,
}: {
  esClient: ElasticsearchClient;
  dataSources: AiInsightsDataSource[];
  timeRange: { from: string; to: string };
  searchQuery?: AiInsightsSearchQuery;
  filters?: unknown[];
  logger: Logger;
}): Promise<PrefetchedDataSourceMetrics[]> {
  const results: PrefetchedDataSourceMetrics[] = [];

  for (const source of dataSources.slice(0, AI_INSIGHTS_MAX_DATA_SOURCES)) {
    try {
      const { keywordFields, numericFields } = await pickFields({
        esClient,
        indexPattern: source.index_pattern,
      });

      const aggs: Record<string, AggregationsAggregationContainer> = {};
      for (const field of keywordFields) {
        aggs[`terms_${field}`] = {
          terms: { field, size: 5 },
        };
      }
      for (const field of numericFields) {
        aggs[`stats_${field}`] = {
          stats: { field },
        };
      }

      const response = await esClient.search({
        index: source.index_pattern,
        size: 0,
        track_total_hits: true,
        query: buildPrefetchQuery({
          timeField: source.time_field,
          timeRange,
          searchQuery,
          filters,
        }),
        aggs,
      });

      const topTerms: PrefetchedDataSourceMetrics['top_terms'] = {};
      const numericStats: PrefetchedDataSourceMetrics['numeric_stats'] = {};
      const aggregations = response.aggregations ?? {};

      for (const field of keywordFields) {
        const bucketAgg = aggregations[`terms_${field}`] as
          | { buckets?: Array<{ key: string | number | boolean; doc_count: number }> }
          | undefined;
        topTerms[field] = (bucketAgg?.buckets ?? []).map((bucket) => ({
          key: String(bucket.key),
          doc_count: bucket.doc_count,
        }));
      }

      for (const field of numericFields) {
        const statsAgg = aggregations[`stats_${field}`] as
          | { avg?: number | null; min?: number | null; max?: number | null }
          | undefined;
        numericStats[field] = {
          avg: statsAgg?.avg ?? null,
          min: statsAgg?.min ?? null,
          max: statsAgg?.max ?? null,
        };
      }

      const totalHits = response.hits.total;
      const docCount =
        typeof totalHits === 'number'
          ? totalHits
          : typeof totalHits?.value === 'number'
          ? totalHits.value
          : undefined;

      results.push({
        index_pattern: source.index_pattern,
        title: source.title,
        time_field: source.time_field,
        doc_count: docCount,
        top_terms: topTerms,
        numeric_stats: numericStats,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(
        `AI insights data-source prefetch failed for ${source.index_pattern}: ${message}`
      );
      results.push({
        index_pattern: source.index_pattern,
        title: source.title,
        time_field: source.time_field,
        error: message,
      });
    }
  }

  return results;
}
