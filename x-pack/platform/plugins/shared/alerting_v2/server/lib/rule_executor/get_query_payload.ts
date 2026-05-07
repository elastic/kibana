/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasStartEndParams } from '@kbn/esql-utils';
import type { EsqlESQLParam, EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { RESERVED_ESQL_PARAMS } from '@kbn/alerting-v2-constants';
import { parseDurationToMs } from '../duration';

export interface GetQueryPayloadParams {
  query: string;
  timeField: string;
  lookbackWindow: string;
  /**
   * For testability. Defaults to Date.now().
   */
  now?: number;
}

export interface QueryPayload {
  dateStart: string;
  dateEnd: string;
  filter: EsqlQueryRequest['filter'];
  params?: EsqlQueryRequest['params'];
}

export function getQueryPayload({
  query,
  timeField,
  lookbackWindow,
  now = Date.now(),
}: GetQueryPayloadParams): QueryPayload {
  const dateEnd = new Date(now).toISOString();
  const dateStart = new Date(now - parseDurationToMs(lookbackWindow)).toISOString();

  const rangeFilter: unknown[] = [
    {
      range: {
        [timeField]: {
          lte: dateEnd,
          gt: dateStart,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const filter: EsqlQueryRequest['filter'] = {
    bool: {
      filter: rangeFilter,
    },
  } as EsqlQueryRequest['filter'];

  if (!hasStartEndParams(query)) {
    return { dateStart, dateEnd, filter };
  }

  const paramValues: Record<string, string> = { _tstart: dateStart, _tend: dateEnd };
  // TODO: wait until client is fixed: https://github.com/elastic/elasticsearch-specification/issues/5083
  const params: EsqlQueryRequest['params'] = RESERVED_ESQL_PARAMS.filter((name) =>
    new RegExp(`\\?${name}`, 'i').test(query)
  ).map((name) => ({ [name]: paramValues[name] } as unknown as EsqlESQLParam));

  return { dateStart, dateEnd, filter, ...(params.length ? { params } : {}) };
}
