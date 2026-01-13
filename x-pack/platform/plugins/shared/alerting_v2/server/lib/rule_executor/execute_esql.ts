/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { hasStartEndParams } from '@kbn/esql-utils';
import type { RuleSavedObjectAttributes } from '../../saved_objects/schemas/rule_saved_object_attributes';
import { parseDurationToMs } from '../duration';
import type { QueryService } from '../services/query_service/query_service';
import type { LoggerService } from '../services/logger_service/logger_service';

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
  queryService,
  abortController,
  rule,
  params,
}: {
  logger: LoggerService;
  queryService: QueryService;
  abortController: AbortController;
  rule: { id: string; spaceId: string; name: string };
  params: ExecuteRuleParams;
}): Promise<ESQLSearchResponse> {
  const dateEnd = new Date().toISOString();
  const dateStart = new Date(Date.now() - parseDurationToMs(params.lookbackWindow)).toISOString();

  const request = { params: getEsqlQuery(params, dateStart, dateEnd) };

  logger.debug({
    message: () =>
      `executing ES|QL query for rule ${rule.id} in space ${rule.spaceId} - ${JSON.stringify(
        request
      )}`,
  });

  try {
    return await queryService.executeQuery({
      query: request.params.query,
      filter: request.params.filter,
      params: request.params.params,
      abortSignal: abortController.signal,
    });
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error('Search has been aborted due to cancelled execution');
    }
    throw error;
  }
}
