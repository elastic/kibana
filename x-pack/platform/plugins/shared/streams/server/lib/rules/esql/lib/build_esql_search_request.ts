/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export const buildEsqlSearchRequest = ({
  query,
  from,
  to,
}: {
  query: string;
  from: string;
  to: string;
}) => {
  const rangeFilter = {
    range: {
      '@timestamp': {
        lte: to,
        gte: from,
        format: 'strict_date_optional_time',
      },
    },
  };

  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter];

  return {
    // Make sure query includes `METADATA _id` so we can fetch the source document
    query: `${query} | limit 10000`,
    filter: {
      bool: {
        filter: requestFilter,
      },
    },
  };
};
