/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { ESQL_SEARCH_STRATEGY, isRunningResponse } from '@kbn/data-plugin/common';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { catchError, filter as rxFilter, lastValueFrom, map, throwError } from 'rxjs';
import { inject, injectable } from 'inversify';
import type { RecordBatch } from 'apache-arrow';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';
import { EsServiceScopedToken } from '../es_service/tokens';

interface ExecuteQueryParams {
  query: ESQLSearchParams['query'];
  filter?: ESQLSearchParams['filter'];
  params?: ESQLSearchParams['params'];
  abortSignal?: AbortSignal;
}

interface ExecuteQueryStreamingParams {
  query: string;
  dropNullColumns?: boolean;
  allowPartialResults?: boolean;
  abortSignal?: AbortSignal;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<ESQLSearchResponse>;
  queryResponseToRecords<T extends Record<string, any>>(response: ESQLSearchResponse): T[];
  executeQueryStreaming(
    params: ExecuteQueryStreamingParams
  ): AsyncIterable<Record<string, unknown>>;
}

@injectable()
export class QueryService implements QueryServiceContract {
  constructor(
    private readonly searchClient: IScopedSearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(EsServiceScopedToken) private readonly esClient: ElasticsearchClient
  ) {}

  async executeQuery({
    query,
    filter,
    params,
    abortSignal,
  }: ExecuteQueryParams): Promise<ESQLSearchResponse> {
    try {
      this.logger.debug({
        message: () =>
          `QueryService: Executing query - ${JSON.stringify({ query, filter, params })}`,
      });

      const request: IKibanaSearchRequest<ESQLSearchParams> = {
        params: {
          query,
          dropNullColumns: false,
          filter,
          params,
        },
      };

      const searchResponse = await lastValueFrom(
        this.searchClient
          .search<
            IKibanaSearchRequest<ESQLSearchParams>,
            IKibanaSearchResponse<ESQLSearchResponse>
          >(request, {
            strategy: ESQL_SEARCH_STRATEGY,
            ...(abortSignal ? { abortSignal } : {}),
          })
          .pipe(
            catchError((error) => {
              this.logger.error({
                error,
                code: 'ESQL_QUERY_ERROR',
                type: 'QueryServiceError',
              });
              return throwError(() => error);
            }),
            rxFilter((resp) => !isRunningResponse(resp)),
            map((resp) => resp.rawResponse)
          )
      );

      this.logger.debug({
        message: `QueryService: Query executed successfully, returned ${searchResponse.values.length} rows`,
      });

      return searchResponse;
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  async *executeQueryStreaming({
    query,
    dropNullColumns = false,
    allowPartialResults = true,
    abortSignal,
  }: ExecuteQueryStreamingParams): AsyncIterable<Record<string, unknown>> {
    try {
      this.logger.debug({
        message: () =>
          `QueryService: Starting streaming query - ${JSON.stringify({
            query,
            dropNullColumns,
            allowPartialResults,
          })}`,
      });

      // Use helpers.esql() for Arrow streaming support
      const esqlHelper = this.esClient.helpers.esql({
        query,
        drop_null_columns: dropNullColumns,
        allow_partial_results: allowPartialResults,
        ...(abortSignal ? { signal: abortSignal } : {}),
      });

      // Get Arrow reader for streaming record batches
      const reader = await esqlHelper.toArrowReader();

      let columnNames: string[] = [];

      // Process record batches and yield row objects
      for await (const recordBatch of reader) {
        // Extract column names from the first batch
        if (columnNames.length === 0 && recordBatch.schema.fields.length > 0) {
          columnNames = recordBatch.schema.fields.map((field) => field.name);
        }

        // Convert batch to row objects and yield them individually
        const rows = this.recordBatchToRecords(recordBatch, columnNames);
        for (const row of rows) {
          yield row;
        }
      }

      this.logger.debug({
        message: 'QueryService: Streaming query completed successfully',
      });
    } catch (error) {
      this.logger.error({
        error,
        code: 'ESQL_STREAMING_QUERY_ERROR',
        type: 'QueryServiceError',
      });

      throw error;
    }
  }

  private recordBatchToRecords(
    recordBatch: RecordBatch,
    columnNames: string[]
  ): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];

    // Process each row in the batch
    for (let rowIndex = 0; rowIndex < recordBatch.numRows; rowIndex++) {
      const rowObject: Record<string, unknown> = {};

      // Extract values for each column in this row
      for (let colIndex = 0; colIndex < recordBatch.numCols; colIndex++) {
        const column = recordBatch.getChildAt(colIndex);
        if (column) {
          const columnName = columnNames[colIndex] || `column_${colIndex}`;
          // Get the value at the current row index
          const value = column.get(rowIndex);
          rowObject[columnName] = value;
        }
      }

      rows.push(rowObject);
    }

    return rows;
  }

  public queryResponseToRecords<T extends Record<string, any>>(response: ESQLSearchResponse): T[] {
    const objects: T[] = [];

    if (response.columns.length === 0 || response.values.length === 0) {
      return [];
    }

    for (const row of response.values) {
      const object: T = {} as T;

      for (const [columnIndex, value] of row.entries()) {
        const columnName = response.columns[columnIndex]?.name as keyof T;

        if (columnName) {
          object[columnName] = value as T[keyof T];
        }
      }

      objects.push(object);
    }

    return objects;
  }
}
