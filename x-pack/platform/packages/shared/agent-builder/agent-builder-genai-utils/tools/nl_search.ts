/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { EsqlResponse } from './utils/esql';
import { generateEsql } from './generate_esql';

export interface NaturalLanguageSearchResponse {
  /**
   * The ES|QL query which was generated based on the provided NL query, index and context
   */
  generatedQuery: string;
  /**
   * The ES|QL data which was returned by executing the query.
   */
  esqlData?: EsqlResponse;
  /**
   * Error message if the query could not be executed
   */
  error?: string;
}

export const naturalLanguageSearch = async ({
  nlQuery,
  target,
  model,
  esClient,
  logger,
  events,
  rowLimit,
  customInstructions,
}: {
  nlQuery: string;
  target: string;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  events: ToolEventEmitter;
  rowLimit?: number;
  customInstructions?: string;
}): Promise<NaturalLanguageSearchResponse> => {
  const queryGenResponse = await generateEsql({
    nlQuery,
    index: target,
    executeQuery: true,
    model,
    esClient,
    logger,
    events,
    rowLimit,
    additionalInstructions: customInstructions,
  });

  return {
    generatedQuery: queryGenResponse.query,
    esqlData: queryGenResponse.results,
    error: queryGenResponse.error,
  };
};
