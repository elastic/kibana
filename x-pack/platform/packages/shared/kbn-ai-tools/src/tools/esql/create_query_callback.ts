/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { runAndValidateEsqlQuery } from '@kbn/inference-plugin/server';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQLRow } from '@kbn/es-types';

export interface RunQueryOutput {
  error?: { message?: string; status?: number };
  errorMessages?: string[];
  columns?: DatatableColumn[];
  rows?: ESQLRow[];
  query: string | { input: string; output: string; isCorrection: boolean };
}

export function createQueryCallback({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): (query: string) => Promise<RunQueryOutput> {
  return async (query: string): Promise<RunQueryOutput> => {
    const queryCorrectionOutput = correctCommonEsqlMistakes(query);

    const queryToolOutput = queryCorrectionOutput.isCorrection ? queryCorrectionOutput : query;

    const queryToRun = queryCorrectionOutput.output;

    const response = await runAndValidateEsqlQuery({
      client: esClient,
      query: queryToRun,
    });
    if (response.error || response.errorMessages?.length) {
      return {
        query: queryToolOutput,
        error:
          response.error && response.error instanceof errors.ResponseError
            ? {
                message: response.error.message,
                status: response.error.statusCode,
              }
            : {
                message: response.error?.message,
              },
        errorMessages: response.errorMessages,
      };
    }

    return {
      query: queryToolOutput,
      columns: response.columns,
      rows: response.rows,
    };
  };
}
