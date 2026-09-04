/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, DescribeAiIndexResponse } from '../../common/http_api/ai_indices';
import { describeAiIndexFields } from './describe_fields';

export interface DescribeAiIndexParams {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexHttpItem;
}

/** Registry entry plus what backing indices expose, read as caller. */
export const describeAiIndex = async ({
  esClient,
  aiIndex,
}: DescribeAiIndexParams): Promise<DescribeAiIndexResponse> => {
  const { id, description, dest, managed } = aiIndex;
  const {
    fields,
    semantic_fields: semanticFields,
    truncated,
  } = await describeAiIndexFields({ esClient, target: dest.value });

  return {
    id,
    esql_target: dest.value,
    ...(description !== undefined && { description }),
    dest,
    managed,
    fields,
    semantic_fields: semanticFields,
    ki_type_counts: [],
    tag_counts: [],
    query_templates: [],
    suggested_queries: {},
    truncated: { fields: truncated, query_templates: false },
  };
};
