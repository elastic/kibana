/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

export interface GetDocumentByIdSuccess {
  id: string;
  index: string;
  found: true;
  _source: unknown;
}

export interface GetDocumentByIdFailure {
  id: string;
  index: string;
  found: false;
}

export type GetDocumentByIdResult = GetDocumentByIdSuccess | GetDocumentByIdFailure;

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
