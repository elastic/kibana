/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

type Response = Array<{
  _id: string;
  _source: Record<string, unknown>;
}>;

export const executeEsqlRequest = async ({
  esClient,
  esqlRequest,
  logger,
}: {
  esClient: ElasticsearchClient;
  esqlRequest: { query: string; filter: estypes.QueryDslQueryContainer };
  logger: Logger;
}): Promise<Response> => {
  try {
    const response = (await esClient.esql.query({
      query: esqlRequest.query,
      filter: esqlRequest.filter,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;

    const { columns, values } = response;

    const [sourceIndex, idIndex] = [
      columns.findIndex((col) => col.name === '_source'),
      columns.findIndex((col) => col.name === '_id'),
    ];

    if (sourceIndex === -1 || idIndex === -1) {
      return [];
    }

    const results = values.map((row) => ({
      _id: row[idIndex],
      _source: row[sourceIndex],
    })) as Response;

    return results;
  } catch (error) {
    const message = `Error executing ES|QL request: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.debug(message);
    throw new Error(message);
  }
};
