/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasStartEndParams } from '@kbn/esql-utils';
import type { EsqlESQLParam, EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
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

  const params: EsqlQueryRequest['params'] = [];

  if (/\?_tstart/i.test(query)) {
    // TODO: wait until client is fixed: https://github.com/elastic/elasticsearch-specification/issues/5083
    params.push({ _tstart: dateStart } as unknown as EsqlESQLParam);
  }
  if (/\?_tend/i.test(query)) {
    // TODO: wait until client is fixed: https://github.com/elastic/elasticsearch-specification/issues/5083
    params.push({ _tend: dateEnd } as unknown as EsqlESQLParam);
  }

  return { dateStart, dateEnd, filter, ...(params.length ? { params } : {}) };
}
