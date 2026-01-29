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

export interface ExecuteQueryParams {
  query: EsqlQueryRequest['query'];
  filter?: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
  abortSignal?: AbortSignal;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<EsqlQueryResponse>;
  queryResponseToRecords<T extends Record<string, unknown>>(response: EsqlQueryResponse): T[];
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
    try {
      this.logger.debug({
        message: () =>
          `QueryService: Executing query - ${JSON.stringify({ query, filter, params })}`,
      });

      const response = await this.esClient.esql.query(
        {
          query,
          drop_null_columns: false,
          filter,
          params,
        },
        { signal: abortSignal }
      );

      const rowCount = Array.isArray(response.values) ? response.values.length : 0;

      this.logger.debug({
        message: `QueryService: Query executed successfully, returned ${rowCount} rows`,
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

  public queryResponseToRecords<T extends Record<string, unknown>>(
    response: EsqlQueryResponse
  ): T[] {
    const objects: T[] = [];
    const columns = response.columns ?? [];
    const values = response.values ?? [];

    if (columns.length === 0 || values.length === 0) {
      return [];
    }

    for (const row of values) {
      const object: T = {} as T;

      for (const [columnIndex, value] of row.entries()) {
        const columnName = columns[columnIndex]?.name as keyof T;

        if (columnName) {
          object[columnName] = value as T[keyof T];
        }
      }

      objects.push(object);
    }

    return objects;
  }
}
