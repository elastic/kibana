/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, Transform } from 'stream';
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
    context: ExecutionContext
  ): AsyncIterable<T[]> {
    let reader: AsyncRecordBatchStreamReader;
    const scope = context.createScope();
    const { stream: capturingStream, getBuffer: getCapturedBuffer } =
      createCapturingTransform(MAX_ERROR_CAPTURE_BYTES);
    const streamPipeline = pipeline(response, capturingStream, { signal: context.signal });

    scope.add(() => {
      capturingStream.destroy();
    });

    try {
      context.throwIfAborted();
      reader = await AsyncRecordBatchStreamReader.from(Readable.from(capturingStream));
    } catch (error) {
      throw this.buildParseError(error, getCapturedBuffer());
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
      throw this.buildParseError(error, getCapturedBuffer());
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

  private buildParseError(error: unknown, capturedBuffer?: Buffer): Error {
    const esError = tryExtractEsError(capturedBuffer);

    if (esError) {
      return new Error(`ES|QL query failed: ${esError}`);
    }

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

/**
 * Max bytes to capture from the response stream for error diagnosis.
 * ES JSON errors are typically small, so 64 KB is more than enough.
 */
const MAX_ERROR_CAPTURE_BYTES = 64 * 1024;

/**
 * Creates a Transform stream that captures the first `maxBytes` of data
 * flowing through it, while forwarding all data unchanged. The captured
 * buffer is used to diagnose errors when Arrow parsing fails — ES returns
 * JSON error bodies even when Arrow format was requested.
 */
const createCapturingTransform = (
  maxBytes: number
): { stream: Transform; getBuffer: () => Buffer } => {
  let capturedBytes = 0;
  const chunks: Buffer[] = [];

  const stream = new Transform({
    transform(chunk, _encoding, callback) {
      if (capturedBytes < maxBytes) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        chunks.push(buf);
        capturedBytes += buf.length;
      }
      callback(null, chunk);
    },
  });

  return { stream, getBuffer: () => Buffer.concat(chunks) };
};

/**
 * Attempts to parse a captured response buffer as a JSON error from
 * Elasticsearch. ES returns JSON errors even when Arrow format is
 * requested, causing the Arrow IPC parser to fail with confusing
 * buffer-allocation errors.
 */
const tryExtractEsError = (buffer?: Buffer): string | undefined => {
  if (!buffer?.length) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(buffer.toString('utf-8'));
    if (parsed.error) {
      return typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error.reason || parsed.error.type || JSON.stringify(parsed.error);
    }
  } catch {
    // Not a JSON response
  }

  return undefined;
};
