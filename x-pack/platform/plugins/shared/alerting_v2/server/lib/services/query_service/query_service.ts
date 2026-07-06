/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest, EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';
import type { QueryStreamFormat } from '../../../config';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import type { ExecutionContext } from '../../execution_context';
import { createExecutionContext, isRuleExecutionCancellationError } from '../../execution_context';

/**
 * Number of rows emitted per batch when streaming an ES|QL result in `json`
 * format. The JSON response is fetched in full and then chunked so downstream
 * consumers still receive stream-like (batched) data, matching the Arrow path.
 */
const JSON_STREAM_BATCH_SIZE = 1000;

export interface ExecuteQueryParams {
  query: EsqlQueryRequest['query'];
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
  abortSignal?: AbortSignal;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<EsqlQueryResponse>;
  executeQueryRows<T = Record<string, unknown>>(params: ExecuteQueryParams): Promise<T[]>;
  executeQueryStream<T = Record<string, unknown>>(params: ExecuteQueryParams): AsyncIterable<T[]>;
}

@injectable()
export class QueryService implements QueryServiceContract {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    private readonly streamFormat: QueryStreamFormat = 'json'
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

  async executeQueryRows<T = Record<string, unknown>>(params: ExecuteQueryParams): Promise<T[]> {
    const response = await this.executeQuery(params);
    return this.toRows<T>(response);
  }

  async *executeQueryStream<T = Record<string, unknown>>(
    params: ExecuteQueryParams
  ): AsyncIterable<T[]> {
    if (this.streamFormat === 'json') {
      yield* this.streamViaJson<T>(params);
      return;
    }

    yield* this.streamViaArrow<T>(params);
  }

  private async *streamViaArrow<T>({
    query,
    filter,
    params,
    abortSignal,
  }: ExecuteQueryParams): AsyncIterable<T[]> {
    const context = createExecutionContext(abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query (arrow format)`,
    });

    let reader: AsyncRecordBatchStreamReader | undefined;

    try {
      context.throwIfAborted();

      reader = await this.esClient.helpers
        .esql(
          {
            query,
            drop_null_columns: false,
            filter,
            params,
          },
          { signal: context.signal }
        )
        .toArrowReader();

      yield* this.iterateReader<T>(reader, context);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully`,
      });
    } catch (error) {
      if (isRuleExecutionCancellationError(error)) {
        this.logger.debug({
          message: 'QueryService: Streaming query aborted',
        });
      } else {
        this.logger.error({
          error,
          code: 'ESQL_QUERY_ERROR',
          type: 'QueryServiceError',
        });
      }

      throw error;
    } finally {
      await this.closeReader(reader);
    }
  }

  private async *streamViaJson<T>({
    query,
    filter,
    params,
    abortSignal,
  }: ExecuteQueryParams): AsyncIterable<T[]> {
    const context = createExecutionContext(abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query (json format)`,
    });

    try {
      context.throwIfAborted();

      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: false,
          filter,
          params,
        },
        { signal: context.signal }
      );

      const rows = this.toRows<T>(response);

      // The JSON response is materialized in full, then re-emitted as batches so
      // downstream consumers keep handling stream-like data (as with Arrow).
      for (let start = 0; start < rows.length; start += JSON_STREAM_BATCH_SIZE) {
        context.throwIfAborted();
        yield rows.slice(start, start + JSON_STREAM_BATCH_SIZE);
      }

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully`,
      });
    } catch (error) {
      if (isRuleExecutionCancellationError(error)) {
        this.logger.debug({
          message: 'QueryService: Streaming query aborted',
        });
      } else {
        this.logger.error({
          error,
          code: 'ESQL_QUERY_ERROR',
          type: 'QueryServiceError',
        });
      }

      throw error;
    }
  }

  private async *iterateReader<T>(
    reader: AsyncRecordBatchStreamReader,
    context: ExecutionContext
  ): AsyncIterable<T[]> {
    try {
      for await (const batch of reader) {
        context.throwIfAborted();

        if (batch.numRows === 0) {
          continue;
        }

        const rows = batch.toArray().map((row) => coerceBigInts(row.toJSON()) as T);
        yield rows;
      }
    } catch (error) {
      if (isRuleExecutionCancellationError(error)) {
        throw error;
      }

      // Arrow parse failures during iteration (e.g. truncated stream).
      // The initial server-error case is already handled by the helper.
      throw this.buildParseError(error);
    }
  }

  private async closeReader(reader: AsyncRecordBatchStreamReader | undefined): Promise<void> {
    if (!reader || reader.closed) {
      return;
    }

    try {
      await reader.cancel();
    } catch {
      // Cleanup is best-effort; the primary error has already been
      // propagated through the iteration above.
    }
  }

  private buildParseError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Failed to parse ES|QL response. Error: ${message}`);
  }

  private toRows<T>(response: EsqlQueryResponse): T[] {
    const columnNames = response.columns.map((column) => column.name);
    return response.values.map((valueRow) => {
      const row = columnNames.reduce<Record<string, unknown>>((acc, columnName, index) => {
        acc[columnName] = valueRow[index];
        return acc;
      }, {});

      return coerceBigInts(row) as T;
    });
  }
}

/**
 * Apache Arrow returns BigInt for integer/long columns.
 * JSON.stringify cannot serialize BigInt, so we coerce to Number
 * at the parsing boundary. ES|QL integer values are within safe
 * Number range.
 */
const coerceBigInts = (row: Record<string, unknown>): Record<string, unknown> => {
  const coerced: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    coerced[key] = typeof value === 'bigint' ? Number(value) : value;
  }

  return coerced;
};
