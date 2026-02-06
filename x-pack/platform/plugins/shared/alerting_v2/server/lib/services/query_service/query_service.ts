/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { EsqlQueryRequest, EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';

export interface ExecuteQueryParams {
  query: EsqlQueryRequest['query'];
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
  abortSignal?: AbortSignal;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<EsqlQueryResponse>;
  executeQueryStream<T = Record<string, unknown>>(params: ExecuteQueryParams): AsyncIterable<T[]>;
}

@injectable()
export class QueryService implements QueryServiceContract {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  async executeQuery({
    query,
    filter,
    params,
    abortSignal,
  }: ExecuteQueryParams): Promise<EsqlQueryResponse> {
    this.logger.debug({
      message: () => `QueryService: Executing query - ${JSON.stringify({ query, filter, params })}`,
    });

    try {
      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: false,
          filter,
          params,
        },
        { signal: abortSignal }
      );

      this.logger.debug({
        message: `QueryService: Query executed successfully, returned ${response.values.length} rows`,
      });

      return response;
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  async *executeQueryStream<T = Record<string, unknown>>({
    query,
    filter,
    params,
    abortSignal,
  }: ExecuteQueryParams): AsyncIterable<T[]> {
    this.logger.debug({
      message: () => `QueryService: Executing streaming query`,
    });

    try {
      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: false,
          filter,
          params,
          format: 'arrow',
        },
        { asStream: true, signal: abortSignal }
      );

      // @ts-expect-error response is a Readable when asStream is true
      yield* this.parseArrowStream<T>(response);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully`,
      });
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  private async *parseArrowStream<T>(response: Readable): AsyncIterable<T[]> {
    let reader: AsyncRecordBatchStreamReader;

    try {
      reader = await AsyncRecordBatchStreamReader.from(Readable.from(response));
    } catch (error) {
      // ES returns JSON instead of Arrow format when there's an error
      // Apache Arrow will fail to parse it, so we throw a more descriptive error
      throw new Error(`Failed to parse ES|QL response. Error: ${error.message}`);
    }

    try {
      for await (const batch of reader) {
        if (batch.numRows === 0) {
          continue;
        }

        const rows = batch.toArray().map((row) => row.toJSON() as T);
        yield rows;
      }
    } catch (error) {
      // ES may return JSON error response instead of Arrow format
      // which causes parsing errors during iteration
      throw new Error(`Failed to parse ES|QL response. Error: ${error.message}`);
    } finally {
      // Clean up the reader
      if (!reader.closed) {
        await reader.cancel();
      }
    }
  }
}
