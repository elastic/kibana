/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import { executeEsql, EsqlResponse } from './steps/execute_esql';
import { generateEsql } from './generate_esql';

export type NaturalLanguageSearchResponse = EsqlResponse | { success: false; reason: string };

export const naturalLanguageSearch = async ({
  query,
  context,
  index,
  model,
  esClient,
}: {
  query: string;
  context?: string;
  index?: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<NaturalLanguageSearchResponse> => {
  const generateResponse = await generateEsql({
    query,
    context,
    index,
    model,
    esClient,
  });

  if (generateResponse.queries.length < 1) {
    return { success: false, reason: 'No query was generated' };
  }

  return await executeEsql({
    query: generateResponse.queries[0],
    esClient,
  });
};
