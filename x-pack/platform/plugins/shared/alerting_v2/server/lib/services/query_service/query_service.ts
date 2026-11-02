/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest, EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import type { EsqlResponseFormatServiceContract } from '../esql_response_format_service/esql_response_format_service';
import { EsqlResponseFormatServiceToken } from '../esql_response_format_service/tokens';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { ExecutionContext } from '../../execution_context';
import {
  createExecutionContext,
  isRuleExecutionCancellationError,
  toRuleExecutionCancellationError,
} from '../../execution_context';
import { toRows } from './row_coercion';
import type {
  EsqlFormatRequest,
  EsqlFormatRequestOptions,
  EsqlResponseFormat,
  EsqlRowBatchSource,
} from './formats';

export interface ExecuteQueryParams {
  query: EsqlQueryRequest['query'];
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
  abortSignal?: AbortSignal;
  /** Maximum allowed response body size in bytes. Passed to the ES transport. */
  maxResponseSize?: number;
  /**
   * Response format to use for this stream. When provided, overrides the
   * feature-flag lookup so the caller can pin the format for the lifetime of
   * a single rule execution and keep the LIMIT and the transport in sync.
   */
  format?: EsqlResponseFormat;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<EsqlQueryResponse>;
  executeQueryRows<T = Record<string, unknown>>(params: ExecuteQueryParams): Promise<T[]>;
  executeQueryStream<T = Record<string, unknown>>(params: ExecuteQueryParams): AsyncIterable<T[]>;
}

const DROP_NULL_COLUMNS = true;

@injectable()
export class QueryService implements QueryServiceContract {
  constructor(
    private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EsqlResponseFormatServiceToken)
    private readonly esqlResponseFormatService: EsqlResponseFormatServiceContract
  ) {}

  async executeQuery({
    query,
    filter,
    params,
    abortSignal,
    maxResponseSize,
  }: ExecuteQueryParams): Promise<EsqlQueryResponse> {
    this.logger.debug({
      message: 'QueryService: Executing query',
    });

    try {
      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: DROP_NULL_COLUMNS,
          filter,
          params,
        },
        { signal: abortSignal, ...(maxResponseSize !== undefined ? { maxResponseSize } : {}) }
      );

      this.logger.debug({
        message: `QueryService: Query executed successfully, returned ${response.values.length} rows`,
      });

      return response;
    } catch (error) {
      this.logger.error({
        error,
        code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
      });

      throw error;
    }
  }

  async executeQueryRows<T = Record<string, unknown>>(params: ExecuteQueryParams): Promise<T[]> {
    const response = await this.executeQuery(params);
    return toRows<T>(response);
  }

  /**
   * Streams query results through the response format resolved from the
   * `alertingV2.esqlResponseFormat` feature flag. Resolved per call, because a
   * rollout can change the flag between two executions of the same rule.
   * Pass `params.format` to pin a pre-snapshotted format and keep the LIMIT
   * and the transport in sync within a single execution.
   */
  async *executeQueryStream<T = Record<string, unknown>>(
    params: ExecuteQueryParams
  ): AsyncIterable<T[]> {
    const format = params.format ?? this.esqlResponseFormatService.get();
    const context = createExecutionContext(params.abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query (${format.name})`,
    });

    let source: EsqlRowBatchSource | undefined;

    try {
      context.throwIfAborted();

      source = await format.open(
        this.esClient,
        buildFormatRequest(params),
        buildFormatRequestOptions(context, params)
      );

      context.throwIfAborted();

      yield* this.iterateBatches<T>(source, context);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully (${format.name})`,
      });
    } catch (error) {
      if (this.isCancellation(error, context)) {
        this.logger.debug({
          message: `QueryService: Streaming query aborted (${format.name})`,
        });

        throw toRuleExecutionCancellationError(error);
      }

      this.logger.error({
        error,
        code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
      });

      throw error;
    } finally {
      await this.closeSource(source);
    }
  }

  private async *iterateBatches<T>(
    source: EsqlRowBatchSource,
    context: ExecutionContext
  ): AsyncIterable<T[]> {
    try {
      for await (const batch of source.batches) {
        context.throwIfAborted();

        if (batch.length === 0) {
          continue;
        }

        yield batch as T[];
      }
    } catch (error) {
      if (isRuleExecutionCancellationError(error)) {
        throw error;
      }

      // Decode failures during iteration (e.g. a truncated Arrow stream).
      // The initial server-error case already surfaced from `format.open`.
      throw this.buildParseError(error);
    }
  }

  private async closeSource(source: EsqlRowBatchSource | undefined): Promise<void> {
    try {
      await source?.close?.();
    } catch {
      // Cleanup is best-effort; the primary error has already been
      // propagated through the iteration above.
    }
  }

  private isCancellation(error: unknown, context: ExecutionContext): boolean {
    return isRuleExecutionCancellationError(error) || context.signal.aborted;
  }

  private buildParseError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Failed to parse ES|QL response. Error: ${message}`);
  }
}

const buildFormatRequest = ({ query, filter, params }: ExecuteQueryParams): EsqlFormatRequest => ({
  query,
  drop_null_columns: DROP_NULL_COLUMNS,
  filter,
  params,
});

const buildFormatRequestOptions = (
  context: ExecutionContext,
  { maxResponseSize }: ExecuteQueryParams
): EsqlFormatRequestOptions => ({
  signal: context.signal,
  ...(maxResponseSize !== undefined ? { maxResponseSize } : {}),
});
