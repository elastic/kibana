/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { EsqlQueryRequest, EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { createExecutionContext, isRuleExecutionCancellationError } from '../../execution_context';

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
    const context = createExecutionContext(abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query`,
    });

    try {
      context.throwIfAborted();

      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: false,
          filter,
          params,
          format: 'arrow',
        },
        { asStream: true, signal: context.signal }
      );

      if (this.isReadable(response)) {
        yield* this.parseArrowStream<T>(response, context);
      } else {
        // Fall back to object rows to keep the stream contract stable.
        context.throwIfAborted();
        yield this.toRows<T>(response as EsqlQueryResponse);
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

  private async *parseArrowStream<T>(
    response: Readable,
    context: ReturnType<typeof createExecutionContext>
  ): AsyncIterable<T[]> {
    let reader: AsyncRecordBatchStreamReader;
    const scope = context.createScope();
    const passthrough = new PassThrough();
    const streamPipeline = pipeline(response, passthrough, { signal: context.signal });
    let pipelineError: unknown;
    scope.add(() => {
      passthrough.destroy();
    });

    try {
      context.throwIfAborted();
      reader = await AsyncRecordBatchStreamReader.from(Readable.from(passthrough));
    } catch (error) {
      // ES returns JSON instead of Arrow format when there's an error
      // Apache Arrow will fail to parse it, so we throw a more descriptive error
      throw this.buildParseError(error);
    }

    scope.add(async () => {
      if (!reader.closed) {
        await reader.cancel();
      }
    });

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
      // ES may return JSON error response instead of Arrow format
      // which causes parsing errors during iteration
      throw this.buildParseError(error);
    } finally {
      try {
        await scope.disposeAll();
        await streamPipeline;
      } catch (error) {
        // Swallow pipeline cancellation errors: the primary error/abort reason
        // is already propagated through the stream iteration above.
        if (!context.signal.aborted) {
          pipelineError = error;
        }
      }
    }

    if (pipelineError) {
      throw pipelineError;
    }
  }

  private buildParseError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Failed to parse ES|QL response. Error: ${message}`);
  }

  private isReadable(value: unknown): value is Readable {
    return value instanceof Readable;
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
