/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { MAX_ALERTS_PER_EXECUTION } from '../common';

export const buildStatsEsqlSearchRequest = ({
  query,
  timestampField,
  from,
  to,
}: {
  query: string;
  timestampField: string;
  from: string;
  to: string;
}): { query: string; filter: estypes.QueryDslQueryContainer } => {
  return {
    query: `${query} | LIMIT ${MAX_ALERTS_PER_EXECUTION}`,
    filter: {
      bool: {
        filter: [
          {
            range: {
              [timestampField]: {
                gte: from,
                lte: to,
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    },
  };
};
