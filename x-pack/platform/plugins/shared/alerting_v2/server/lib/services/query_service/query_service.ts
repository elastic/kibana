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
import { Type, type AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { ExecutionContext } from '../../execution_context';
import { createExecutionContext, isRuleExecutionCancellationError } from '../../execution_context';
import type { PluginConfig } from '../../../config';

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
    return this.toRows<T>(response);
  }

  async *executeQueryStream<T = Record<string, unknown>>(
    params: ExecuteQueryParams
  ): AsyncIterable<T[]> {
    const { responseFormat } = this.pluginConfigAccessor.get<PluginConfig>().esql;

    if (responseFormat === 'arrow') {
      yield* this.streamArrow<T>(params);
      return;
    }

    yield* this.streamJson<T>(params);
  }

  /**
   * Runs the single-shot JSON query and yields the full result set as one in-memory batch,
   * preserving the `AsyncIterable<T[]>` contract. Cancellation is scoped to this
   * rule-execution streaming boundary, mirroring the arrow path.
   */
  private async *streamJson<T>({
    query,
    filter,
    params,
    abortSignal,
    maxResponseSize,
  }: ExecuteQueryParams): AsyncIterable<T[]> {
    const context = createExecutionContext(abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query (json)`,
    });

    try {
      context.throwIfAborted();

      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: DROP_NULL_COLUMNS,
          filter,
          params,
        },
        { signal: context.signal, ...(maxResponseSize !== undefined ? { maxResponseSize } : {}) }
      );

      context.throwIfAborted();

      const rows = this.toRows<T>(response, { normalizeDates: true });

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully (json)`,
      });

      // Empty results return nothing, this mirrors the arrow path so callers
      // relying on `withAtLeastOne` keep the same fallback behaviour.
      if (rows.length === 0) {
        return;
      }

      yield rows;
    } catch (error) {
      if (this.isCancellation(error, context)) {
        this.logger.debug({
          message: 'QueryService: Streaming query aborted (json)',
        });
      } else {
        this.logger.error({
          error,
          code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
        });
      }

      throw error;
    }
  }

  private async *streamArrow<T>({
    query,
    filter,
    params,
    abortSignal,
    maxResponseSize,
  }: ExecuteQueryParams): AsyncIterable<T[]> {
    const context = createExecutionContext(abortSignal ?? new AbortController().signal);

    this.logger.debug({
      message: () => `QueryService: Executing streaming query (arrow)`,
    });

    let reader: AsyncRecordBatchStreamReader | undefined;

    try {
      context.throwIfAborted();

      // Note: Arrow streaming uses chunked transfer encoding so the transport's
      // maxResponseSize guard (which checks Content-Length) will not fire.
      // The per-run alerts.max row limit acts as the primary guardrail here.
      reader = await this.esClient.helpers
        .esql(
          {
            query,
            drop_null_columns: DROP_NULL_COLUMNS,
            filter,
            params,
          },
          { signal: context.signal, ...(maxResponseSize !== undefined ? { maxResponseSize } : {}) }
        )
        .toArrowReader();

      if (!reader) {
        throw new Error('toArrowReader returned undefined');
      }

      yield* this.iterateReader<T>(reader, context);

      this.logger.debug({
        message: `QueryService: Streaming query completed successfully (arrow)`,
      });
    } catch (error) {
      if (this.isCancellation(error, context)) {
        this.logger.debug({
          message: 'QueryService: Streaming query aborted (arrow)',
        });
      } else {
        this.logger.error({
          error,
          code: ALERTING_LOG_CODES.QUERY_ESQL_EXECUTION_FAILED,
        });
      }

      throw error;
    } finally {
      await this.closeReader(reader);
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

        const dateColumns = new Set(
          batch.schema.fields
            .filter((field) => field.typeId === Type.Timestamp)
            .map((field) => field.name)
        );
        const rows = batch.toArray().map((row) => coerceRow(row.toJSON(), dateColumns) as T);
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

  /**
   * Builds row objects from an ES|QL response.
   *
   * `normalizeDates` coerces `date` / `date_nanos` columns to integer epoch millis
   * via {@link toEpochMillis}, keeping the JSON and Arrow formats consistent. It
   * defaults to `false` because the `executeQueryRows` callers expect ISO-8601 date
   * strings today; only the streaming path, which must match Arrow format, opts in.
   */
  private toRows<T>(
    response: EsqlQueryResponse,
    { normalizeDates = false }: { normalizeDates?: boolean } = {}
  ): T[] {
    const columnNames = response.columns.map((column) => column.name);
    const dateColumnNames = normalizeDates
      ? new Set(
          response.columns
            .filter((column) => column.type === 'date' || column.type === 'date_nanos')
            .map((column) => column.name)
        )
      : undefined;

    return response.values.map((valueRow) => {
      const row = columnNames.reduce<Record<string, unknown>>((acc, columnName, index) => {
        acc[columnName] = valueRow[index];
        return acc;
      }, {});

      return coerceRow(row, dateColumnNames) as T;
    });
  }
}

/**
 * Coerces a raw row into a plain object in a single pass.
 *
 * Apache Arrow returns BigInt for integer/long columns.
 * JSON.stringify cannot serialize BigInt, so we coerce to Number
 * at the parsing boundary. ES|QL integer values are within safe
 * Number range.
 * Columns listed in `dateColumns` are normalized to integer epoch millis instead, via {@link toEpochMillis}.
 */
const coerceRow = (
  row: Record<string, unknown>,
  dateColumns?: ReadonlySet<string>
): Record<string, unknown> => {
  const coerced: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (dateColumns?.has(key)) {
      coerced[key] = toEpochMillis(value);
    } else {
      coerced[key] = typeof value === 'bigint' ? Number(value) : value;
    }
  }

  return coerced;
};

/**
 * Normalizes an ES|QL `date` / `date_nanos` value to integer epoch millis, handling both response formats.
 *
 */
const toEpochMillis = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toEpochMillis);
  } else if (typeof value === 'string') {
    const millis = Date.parse(value);
    // Defensive: date-typed columns are always parseable ISO-8601, so this
    // fallback is unreachable in practice; keep the raw string over `NaN`.
    return Number.isNaN(millis) ? value : millis;
  } else if (typeof value === 'number') {
    return Math.trunc(value);
  }

  return value;
};
