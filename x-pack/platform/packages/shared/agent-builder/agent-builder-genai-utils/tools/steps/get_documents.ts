/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { isCcsTarget } from '../utils/ccs';

export interface GetDocumentByIdSuccess {
  id: string;
  index: string;
  found: true;
  _source: Record<string, unknown>;
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
  // CCS fallback: the _doc (GET) API does not support cross-cluster index patterns,
  // so we use _search with a targeted term query on _id instead.
  if (isCcsTarget(index)) {
    const response = await esClient.search({
      index,
      size: 1,
      query: { term: { _id: id } },
    });
    const hit = response.hits?.hits?.[0];
    if (!hit || hit._source === undefined) {
      return { id, index, found: false };
    }
    return {
      id: hit._id!,
      index: hit._index ?? index,
      found: true,
      _source: (hit._source as Record<string, unknown>) ?? {},
    };
  }

  const { body: response, statusCode } = await esClient.get<Record<string, unknown>>(
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
