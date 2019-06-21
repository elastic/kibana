/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';

import { InfraDatabaseSearchResponse } from '../lib/adapters/framework';

export async function fetchLatestTime(
  search: <Hit, Aggregations>(
    params: SearchParams
  ) => Promise<InfraDatabaseSearchResponse<Hit, Aggregations>>,
  indices: string[],
  timeField: string
): Promise<number> {
  const response = await search<any, { max_time?: { value: number } }>({
    allowNoIndices: true,
    body: {
      aggregations: {
        max_time: {
          max: {
            field: timeField,
          },
        },
      },
      query: {
        match_all: {},
      },
      size: 0,
    },
    ignoreUnavailable: true,
    index: indices,
  });

  if (response.aggregations && response.aggregations.max_time) {
    return response.aggregations.max_time.value;
  } else {
    return 0;
  }
}
