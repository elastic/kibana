/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, DescribeAiIndexResponse } from '../../common/http_api/ai_indices';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { describeAiIndexQueryTemplates } from './describe_templates';
import { buildSuggestedQueries } from './suggested_queries';

export interface DescribeAiIndexParams {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexHttpItem;
  spaceId: string;
}

/** Registry entry plus what backing indices expose, read as caller and filtered to `spaceId`. */
export const describeAiIndex = async ({
  esClient,
  aiIndex,
  spaceId,
}: DescribeAiIndexParams): Promise<DescribeAiIndexResponse> => {
  const { id, description, dest, managed } = aiIndex;
  const target = dest.value;
  const {
    fields,
    semantic_fields: semanticFields,
    truncated: fieldsTruncated,
  } = await describeAiIndexFields({ esClient, target });

  const [
    { ki_type_counts: kiTypeCounts, tag_counts: tagCounts },
    { query_templates: queryTemplates, truncated: templatesTruncated },
  ] = await Promise.all([
    describeAiIndexAggregations({ esClient, target, spaceId, fields }),
    describeAiIndexQueryTemplates({ esClient, target, spaceId, fields }),
  ]);

  return {
    id,
    esql_target: target,
    ...(description !== undefined && { description }),
    dest,
    managed,
    fields,
    semantic_fields: semanticFields,
    ki_type_counts: kiTypeCounts,
    tag_counts: tagCounts,
    query_templates: queryTemplates,
    suggested_queries: buildSuggestedQueries({
      target,
      fields,
      semanticFields,
      topType: kiTypeCounts[0]?.type,
    }),
    truncated: { fields: fieldsTruncated, query_templates: templatesTruncated },
  };
};
