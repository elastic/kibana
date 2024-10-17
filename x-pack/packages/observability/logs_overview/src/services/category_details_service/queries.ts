/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { createCategoryQuery } from '../categorize_logs_service/queries';

export const createGetLogCategoryDocumentsRequestParams = ({
  index,
  timeField,
  messageField,
  startTimestamp,
  endTimestamp,
  additionalFilters = [],
  categoryTerms = '',
  documentCount = 20,
}: {
  startTimestamp: string;
  endTimestamp: string;
  index: string;
  timeField: string;
  messageField: string;
  additionalFilters?: QueryDslQueryContainer[];
  categoryTerms?: string;
  documentCount?: number;
}) => {
  return {
    index,
    size: documentCount,
    track_total_hits: false,
    sort: [{ [timeField]: { order: 'desc' } }],
    query: {
      bool: {
        filter: [
          {
            exists: {
              field: messageField,
            },
          },
          {
            range: {
              [timeField]: {
                gte: startTimestamp,
                lte: endTimestamp,
                format: 'strict_date_time',
              },
            },
          },
          createCategoryQuery(messageField)(categoryTerms),
          ...additionalFilters,
        ],
      },
    },
  };
};
