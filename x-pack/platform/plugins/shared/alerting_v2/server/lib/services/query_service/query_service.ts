/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest, EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, PluginInitializerContext } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import { PluginInitializer } from '@kbn/core-di-server';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { ExecutionContext } from '../../execution_context';
import { createExecutionContext, isRuleExecutionCancellationError } from '../../execution_context';
import type { PluginConfig } from '../../../config';
import { toRows } from './row_coercion';
import type { EsqlFormatRequest, EsqlFormatRequestOptions, EsqlRowBatchSource } from './formats';
import { getEsqlResponseFormat } from './formats';

export interface ExecuteQueryParams {
  query: EsqlQueryRequest['query'];
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
  abortSignal?: AbortSignal;
  /** Maximum allowed response body size in bytes. Passed to the ES transport. */
  maxResponseSize?: number;
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
    @inject(PluginInitializer('config'))
    private readonly pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
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
   * Streams query results through the configured response format. The format is
   * resolved per call because `xpack.alerting_v2.esql.responseFormat` is a
   * dynamic setting operators can flip at runtime.
   */
  async *executeQueryStream<T = Record<string, unknown>>(
    params: ExecuteQueryParams
  ): AsyncIterable<T[]> {
    const { responseFormat } = this.pluginConfigAccessor.get<PluginConfig>().esql;
    const format = getEsqlResponseFormat(responseFormat);
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

      yield* this.iterateBatches<T>(source, context);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully (${format.name})`,
      });
    } catch (error) {
      if (this.isCancellation(error, context)) {
        this.logger.debug({
          message: `QueryService: Streaming query aborted (${format.name})`,
        });
      } else {
        this.logger.error({
          error,
          code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
        });
      }

      throw error;
    } finally {
      await this.closeSource(source);
    }
  }

  /**
   * Drives the format's batches and enforces the guarantees every format shares:
   * abort between batches, empty batches never reach callers, and decode
   * failures surface as a descriptive parse error.
   */
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

  /**
   * A mid-flight abort surfaces as a transport `RequestAbortedError`, so we also
   * treat the error as a cancellation when our execution signal has fired. The
   * `maxResponseSize` guard aborts internally without it, staying a real error.
   */
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
