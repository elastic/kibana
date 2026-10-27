/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  MAX_AI_INDEX_DESCRIBE_TAG_COUNTS,
  MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS,
} from '../../common/constants';
import type { AiIndexDest, KiTypeCount } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { EXCLUDE_MEMORY_KI_TYPES_CONDITION } from './example_queries';
import { kiLifecyclePipeline } from './ki_lifecycle';
import type { AiIndexField, AiIndexTagCount } from './types';

const KI_TYPE_FIELD = 'type';
const KI_TAGS_FIELD = 'tags';

/** Bucket keys must be strings: `conflict` and numeric mappings are excluded by construction. */
const KEYWORD_TYPES: ReadonlySet<string> = new Set(['keyword', 'constant_keyword', 'wildcard']);

export interface AiIndexAggregationsDescription {
  kiTypeCounts: KiTypeCount[];
  tagCounts: AiIndexTagCount[];
}

export interface DescribeAiIndexAggregationsParams {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  fields: AiIndexField[];
}

const NO_COUNTS: AiIndexAggregationsDescription = { kiTypeCounts: [], tagCounts: [] };

const isAggregatableKeyword = (fields: AiIndexField[], path: string): boolean =>
  fields.some(
    (field) => field.path === path && field.aggregatable && KEYWORD_TYPES.has(field.type)
  );

/** Counts per value of `field` over the current, active, unexpired KIs; `tags` is multi-valued. */
const countsQuery = (
  { type, value }: AiIndexDest,
  field: string,
  size: number,
  excludeMemory: boolean
): string =>
  [
    `FROM ${value} METADATA _id, _index`,
    ...kiLifecyclePipeline(type),
    ...(excludeMemory ? [`WHERE ${EXCLUDE_MEMORY_KI_TYPES_CONDITION}`] : []),
    ...(field === KI_TAGS_FIELD ? [`MV_EXPAND ${field}`] : []),
    `WHERE ${field} IS NOT NULL`,
    `STATS count = COUNT(*) BY ${field}`,
    `SORT count DESC, ${field} ASC`,
    `LIMIT ${size}`,
  ].join('\n| ');

const runCounts = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  query: string
): Promise<Array<Record<string, unknown>>> => {
  const { columns, values } = (await esClient.esql.query({
    query,
    filter: buildAiIndexSpaceFilter(spaceId),
    allow_partial_results: false,
  })) as unknown as ESQLSearchResponse;
  return values.map((row) => Object.fromEntries(columns.map((column, i) => [column.name, row[i]])));
};

/**
 * Space- and lifecycle-filtered counts on `type` / `tags`, through the same pipeline `_query`
 * applies; each skipped unless an aggregatable keyword. A caller without index `read` is turned
 * away by the read service before reaching here.
 */
export const describeAiIndexAggregations = async ({
  esClient,
  dest,
  spaceId,
  fields,
}: DescribeAiIndexAggregationsParams): Promise<AiIndexAggregationsDescription> => {
  const hasType = isAggregatableKeyword(fields, KI_TYPE_FIELD);
  const hasTags = isAggregatableKeyword(fields, KI_TAGS_FIELD);
  if (!hasType && !hasTags) {
    return NO_COUNTS;
  }

  const [types, tags] = await Promise.all([
    hasType
      ? runCounts(
          esClient,
          spaceId,
          countsQuery(dest, KI_TYPE_FIELD, MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS, true)
        )
      : [],
    hasTags
      ? runCounts(
          esClient,
          spaceId,
          countsQuery(dest, KI_TAGS_FIELD, MAX_AI_INDEX_DESCRIBE_TAG_COUNTS, hasType)
        )
      : [],
  ]);

  return {
    kiTypeCounts: types.map((row) => ({ type: String(row.type), count: Number(row.count) })),
    tagCounts: tags.map((row) => ({ tag: String(row.tags), count: Number(row.count) })),
  };
};
