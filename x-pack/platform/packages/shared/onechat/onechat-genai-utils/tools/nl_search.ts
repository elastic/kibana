/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import type { EsqlResponse } from './steps/execute_esql';
import { executeEsql } from './steps/execute_esql';
import { generateEsql } from './generate_esql';

export type NaturalLanguageSearchResponse = EsqlResponse;

export const naturalLanguageSearch = async ({
  nlQuery,
  context,
  index,
  model,
  esClient,
}: {
  nlQuery: string;
  context?: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<NaturalLanguageSearchResponse> => {
  const generateResponse = await generateEsql({
    nlQuery,
    context,
    index,
    model,
    esClient,
  });

  if (generateResponse.queries.length < 1) {
    throw new Error(`No esql queries were generated for query=${nlQuery}`);
  }

  return executeEsql({
    query: generateResponse.queries[0], // TODO: handle multiple queries
    esClient,
  });
};
