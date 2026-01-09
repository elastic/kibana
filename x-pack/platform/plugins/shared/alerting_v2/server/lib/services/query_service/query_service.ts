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
import { injectable } from 'inversify';
import type { LoggerService } from '../logger_service/logger_service';

interface ExecuteQueryParams {
  query: ESQLSearchParams['query'];
  filter?: ESQLSearchParams['filter'];
  params?: ESQLSearchParams['params'];
}

@injectable()
export class QueryService {
  constructor(
    private readonly searchClient: IScopedSearchClient,
    private readonly logger: LoggerService
  ) {}

  async executeQuery({ query, filter, params }: ExecuteQueryParams): Promise<ESQLSearchResponse> {
    try {
      this.logger.debug({ message: 'QueryService: Executing query' });

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
