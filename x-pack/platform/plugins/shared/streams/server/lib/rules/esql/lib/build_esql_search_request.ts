/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { MAX_ALERTS_PER_EXECUTION } from '../common';

export const buildEsqlSearchRequest = ({
  query,
  timestampField,
  from,
  to,
  previousOriginalDocumentIds,
}: {
  query: string;
  timestampField: string;
  from: string;
  to: string;
  previousOriginalDocumentIds: string[];
}): { query: string; filter: estypes.QueryDslQueryContainer } => {
  const sanitizedDocumentIds = previousOriginalDocumentIds.filter((id) => id != null);
  const rangeFilter = {
    range: {
      [timestampField]: {
        lte: to,
        gte: from,
        format: 'strict_date_optional_time',
      },
    },
  };

  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter];

  return {
    // Make sure query includes `METADATA _id, _source`
    query: `${query} | limit ${MAX_ALERTS_PER_EXECUTION}`,
    filter: {
      bool: {
        must_not:
          sanitizedDocumentIds.length > 0
            ? [
                {
                  terms: {
                    _id: sanitizedDocumentIds,
                  },
                },
              ]
            : [],
        filter: requestFilter,
      },
    },
  };
};
