/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import type { EsqlResponse } from './utils/esql';
import { executeEsql } from './utils/esql';
import { generateEsql } from './generate_esql';

export interface NaturalLanguageSearchResponse {
  /**
   * The ES|QL query which was generated based on the provided NL query, index and context
   */
  generatedQuery: string;
  /**
   * The ES|QL data which was returned by executing the query.
   */
  esqlData: EsqlResponse;
}

export const naturalLanguageSearch = async ({
  nlQuery,
  context,
  target,
  model,
  esClient,
}: {
  nlQuery: string;
  context?: string;
  target: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<NaturalLanguageSearchResponse> => {
  const queryGenResponse = await generateEsql({
    nlQuery,
    context,
    index: target,
    model,
    esClient,
  });

  if (queryGenResponse.queries.length < 1) {
    throw new Error(`No esql queries were generated for query=${nlQuery}`);
  }

  const esqlData = await executeEsql({
    query: queryGenResponse.queries[0], // TODO: handle multiple queries
    esClient,
  });

  return {
    generatedQuery: queryGenResponse.queries[0],
    esqlData,
  };
};
