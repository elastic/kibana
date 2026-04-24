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
import type { ExecutionContext } from '../../execution_context';
import type { CancellationScope } from '../../execution_context/cancellation_scope';
import { createExecutionContext, isRuleExecutionCancellationError } from '../../execution_context';

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

  async executeQueryRows<T = Record<string, unknown>>(params: ExecuteQueryParams): Promise<T[]> {
    const response = await this.executeQuery(params);
    return this.toRows<T>(response);
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

      yield* this.executeArrowQuery<T>({ query, filter, params }, context);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully`,
      });
    } catch (error) {
      if (isRuleExecutionCancellationError(error)) {
        this.logger.debug({
          message: 'QueryService: Streaming query aborted',
        });
        throw error;
      }

      if (isArrowFormatError(error)) {
        this.logger.debug({
          message:
            'QueryService: Arrow format unsupported for this query, falling back to JSON format',
        });
        const jsonResponse = await this.executeQuery({ query, filter, params, abortSignal });
        yield this.toRows<T>(jsonResponse);
        return;
      }

      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  private async *executeArrowQuery<T>(
    { query, filter, params }: Omit<ExecuteQueryParams, 'abortSignal'>,
    context: ExecutionContext
  ): AsyncIterable<T[]> {
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
      context.throwIfAborted();
      yield this.toRows<T>(response as EsqlQueryResponse);
    }
  }

  private async *parseArrowStream<T>(
    response: Readable,
    context: ExecutionContext
  ): AsyncIterable<T[]> {
    let reader: AsyncRecordBatchStreamReader;
    const scope = context.createScope();
    const passthrough = new PassThrough();

    // Peek at the first chunk before wiring the pipeline.
    // With `asStream: true` the ES client bypasses HTTP status checking, so
    // ES|QL errors arrive as a JSON body in the same Readable stream. Without
    // this guard, the Arrow reader interprets JSON bytes as IPC message sizes,
    // producing a misleading "size out of range" error that masks the real one.
    const firstChunk = await new Promise<Buffer | null>((resolve) => {
      response.once('data', (chunk: Buffer) => resolve(chunk));
      response.once('end', () => resolve(null));
      response.once('error', () => resolve(null));
    });

    if (firstChunk !== null && firstChunk.length > 0 && firstChunk[0] === 0x7b) {
      const remaining: Buffer[] = [];
      for await (const chunk of response) {
        remaining.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat([firstChunk, ...remaining]).toString('utf-8');
      throw new Error(`ES|QL query failed: ${body}`);
    }

    if (firstChunk !== null) {
      passthrough.write(firstChunk);
    }
    const streamPipeline = pipeline(response, passthrough, { signal: context.signal });

    scope.add(() => {
      passthrough.destroy();
    });

    try {
      context.throwIfAborted();
      reader = await AsyncRecordBatchStreamReader.from(Readable.from(passthrough));
    } catch (error) {
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
      await this.cleanupStream({ scope, streamPipeline, context });
    }
  }

  /**
   * Disposes scoped resources and awaits the stream pipeline to ensure
   * the underlying HTTP response is fully closed and no unhandled
   * promise rejections are left behind.
   */
  private async cleanupStream({
    scope,
    streamPipeline,
    context,
  }: {
    scope: CancellationScope;
    streamPipeline: Promise<void>;
    context: ExecutionContext;
  }): Promise<void> {
    try {
      await scope.disposeAll();
      /*
       * Await the pipeline promise to prevent unhandled rejections and
       * ensure the underlying HTTP response stream is fully closed.
       */
      await streamPipeline;
    } catch (error) {
      /*
       * Swallow pipeline cancellation errors: the primary error/abort reason
       * is already propagated through the stream iteration above.
       */
      if (!context.signal.aborted) {
        throw error;
      }
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

function isArrowFormatError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('not supported by the Arrow format');
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
