/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MAX_AI_INDEX_DESCRIBE_TAG_COUNTS,
  MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS,
} from '../../common/constants';
import type { AiIndexField, AiIndexTagCount, KiTypeCount } from '../../common/http_api/ai_indices';
import { buildAiIndexSpaceFilter } from '../../common/space_filter';
import { KEYWORD_TYPES, isUsableField } from './field_types';

export const KI_TYPE_FIELD = 'type';
const KI_TAGS_FIELD = 'tags';

interface TermsBuckets {
  buckets: Array<{ key: string; doc_count: number }>;
}

interface DescribeAggregations {
  types?: TermsBuckets;
  tags?: TermsBuckets;
}

export interface AiIndexAggregationsDescription {
  ki_type_counts: KiTypeCount[];
  tag_counts: AiIndexTagCount[];
}

export interface DescribeAiIndexAggregationsParams {
  esClient: ElasticsearchClient;
  target: string;
  spaceId: string;
  fields: AiIndexField[];
}

/** Bucket keys must be strings; excludes `conflict` and numeric mappings. */
const isAggregatable = (fields: AiIndexField[], path: string): boolean =>
  fields.some(
    (field) =>
      field.path === path &&
      field.aggregatable &&
      isUsableField(field) &&
      KEYWORD_TYPES.has(field.type)
  );

/**
 * Space-filtered `terms` counts on `type` / `tags`; each skipped unless an aggregatable keyword.
 * Shard failures error out rather than return undercounts.
 */
export const describeAiIndexAggregations = async ({
  esClient,
  target,
  spaceId,
  fields,
}: DescribeAiIndexAggregationsParams): Promise<AiIndexAggregationsDescription> => {
  const hasType = isAggregatable(fields, KI_TYPE_FIELD);
  const hasTags = isAggregatable(fields, KI_TAGS_FIELD);
  if (!hasType && !hasTags) {
    return { ki_type_counts: [], tag_counts: [] };
  }

  const response = await esClient.search<never, DescribeAggregations>({
    index: target,
    ignore_unavailable: true,
    allow_no_indices: true,
    allow_partial_search_results: false,
    size: 0,
    track_total_hits: false,
    query: buildAiIndexSpaceFilter(spaceId),
    aggs: {
      ...(hasType && {
        types: {
          terms: {
            field: KI_TYPE_FIELD,
            size: MAX_AI_INDEX_DESCRIBE_TYPE_COUNTS,
            order: [{ _count: 'desc' }, { _key: 'asc' }],
          },
        },
      }),
      ...(hasTags && {
        tags: {
          terms: {
            field: KI_TAGS_FIELD,
            size: MAX_AI_INDEX_DESCRIBE_TAG_COUNTS,
            order: [{ _count: 'desc' }, { _key: 'asc' }],
          },
        },
      }),
    },
  });

  const { types, tags } = response.aggregations ?? {};
  return {
    ki_type_counts: (types?.buckets ?? []).map(({ key, doc_count }) => ({
      type: key,
      count: doc_count,
    })),
    tag_counts: (tags?.buckets ?? []).map(({ key, doc_count }) => ({
      tag: key,
      count: doc_count,
    })),
  };
};
