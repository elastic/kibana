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

const getDocumentByIdSchema = z.object({
  id: z.string().describe('ID of the document to retrieve'),
  index: z.string().describe('Index to retrieve the document from'),
});

export type GetDocumentByIdResult =
  | {
      id: string;
      index: string;
      found: true;
      _source: unknown;
    }
  | {
      id: string;
      index: string;
      found: false;
    };

export const getDocumentByIdTool = (): RegisteredTool<
  typeof getDocumentByIdSchema,
  GetDocumentByIdResult
> => {
  return {
    id: OnechatToolIds.getDocumentById,
    description: 'Retrieve the full content of a document based on its ID and index name.',
    schema: getDocumentByIdSchema,
    handler: async ({ id, index }, { esClient }) => {
      return getDocumentById({ id, index, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const getDocumentById = async ({
  id,
  index,
  esClient,
}: {
  id: string;
  index: string;
  esClient: ElasticsearchClient;
}): Promise<GetDocumentByIdResult> => {
  const { body: response, statusCode } = await esClient.get(
    {
      id,
      index,
    },
    { ignore: [404], meta: true }
  );
  if (statusCode === 404) {
    return { id, index, found: false };
  }
  return {
    id,
    index,
    found: true,
    _source: response._source ?? {},
  };
};
