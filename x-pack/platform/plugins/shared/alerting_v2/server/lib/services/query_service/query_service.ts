/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY, isRunningResponse } from '@kbn/data-plugin/common';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { inject, injectable } from 'inversify';
import { catchError, lastValueFrom, map, filter as rxFilter, throwError } from 'rxjs';
import type { LoggerServiceContract } from '../logger_service/logger_service';
import { LoggerServiceToken } from '../logger_service/logger_service';

interface ExecuteQueryParams {
  query: ESQLSearchParams['query'];
  filter?: ESQLSearchParams['filter'];
  params?: ESQLSearchParams['params'];
  abortSignal?: AbortSignal;
}

export interface QueryServiceContract {
  executeQuery(params: ExecuteQueryParams): Promise<ESQLSearchResponse>;
}

@injectable()
export class QueryService implements QueryServiceContract {
  constructor(
    private readonly searchClient: IScopedSearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
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
}
