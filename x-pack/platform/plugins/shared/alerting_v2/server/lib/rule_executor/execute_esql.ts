/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { ESQL_SEARCH_STRATEGY, isRunningResponse } from '@kbn/data-plugin/common';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { catchError, filter, lastValueFrom, map, throwError } from 'rxjs';
import { hasStartEndParams } from '@kbn/esql-utils';
import type { RuleSavedObjectAttributes } from '../../saved_objects/schemas/rule_saved_object_attributes';
import { parseDurationToMs } from '../duration';

export const getEsqlQuery = (
  params: ExecuteRuleParams,
  dateStart: string,
  dateEnd: string
): ESQLSearchParams => {
  const rangeFilter: unknown[] = [
    {
      range: {
        [params.timeField]: {
          lte: dateEnd,
          gt: dateStart,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const query = {
    query: params.query,
    filter: {
      bool: {
        filter: rangeFilter,
      },
    },
    ...(hasStartEndParams(params.query)
      ? { params: [{ _tstart: dateStart }, { _tend: dateEnd }] }
      : {}),
  };
  return query;
};

export type ExecuteRuleParams = Pick<
  RuleSavedObjectAttributes,
  'query' | 'timeField' | 'lookbackWindow'
>;

export async function executeEsqlRule({
  logger,
  searchClient,
  abortController,
  rule,
  params,
}: {
  logger: Logger;
  searchClient: IScopedSearchClient;
  abortController: AbortController;
  rule: { id: string; spaceId: string; name: string };
  params: ExecuteRuleParams;
}): Promise<ESQLSearchResponse> {
  const dateEnd = new Date().toISOString();
  const dateStart = new Date(Date.now() - parseDurationToMs(params.lookbackWindow)).toISOString();

  const request = { params: getEsqlQuery(params, dateStart, dateEnd) };

  logger.debug(
    () =>
      `executing ES|QL query for rule ${rule.id} in space ${rule.spaceId} - ${JSON.stringify(
        request
      )}`
  );

  return await lastValueFrom(
    searchClient
      .search<IKibanaSearchRequest<ESQLSearchParams>, IKibanaSearchResponse<ESQLSearchResponse>>(
        request,
        {
          strategy: ESQL_SEARCH_STRATEGY,
          abortSignal: abortController.signal,
        }
      )
      .pipe(
        catchError((error) => {
          if (abortController.signal.aborted) {
            return throwError(
              () => new Error('Search has been aborted due to cancelled execution')
            );
          }
          return throwError(() => error);
        }),
        filter((response) => !isRunningResponse(response)),
        map((response) => response.rawResponse)
      )
  );
}
