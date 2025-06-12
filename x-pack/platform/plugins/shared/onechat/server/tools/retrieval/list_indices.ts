/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const listIndicesSchema = z.object({
  pattern: z
    .string()
    .optional()
    .describe(
      '(optional) pattern to filter indices by. Defaults to *. Leave empty to list all indices (recommended)'
    ),
});

export interface ListIndexInfo {
  index: string;
  status: string;
  health: string;
  uuid: string;
  docsCount: number;
  primaries: number;
  replicas: number;
}

export const listIndicesTool = (): RegisteredTool<typeof listIndicesSchema, ListIndexInfo[]> => {
  return {
    id: OnechatToolIds.listIndices,
    description: 'List the indices in the Elasticsearch cluster the current user has access to.',
    schema: listIndicesSchema,
    handler: async ({ pattern = '*' }, { esClient }) => {
      return listIndices({ pattern, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const listIndices = async ({
  pattern = '*',
  esClient,
}: {
  pattern?: string;
  esClient: ElasticsearchClient;
}): Promise<ListIndexInfo[]> => {
  const response = await esClient.cat.indices({
    index: pattern,
    format: 'json',
  });

  return response.map(({ index, status, health, uuid, 'docs.count': docsCount, pri, rep }) => ({
    index: index ?? 'unknown',
    status: status ?? 'unknown',
    health: health ?? 'unknown',
    uuid: uuid ?? 'unknown',
    docsCount: parseInt(docsCount ?? '0', 10),
    primaries: parseInt(pri ?? '1', 10),
    replicas: parseInt(rep ?? '0', 10),
  }));
};
