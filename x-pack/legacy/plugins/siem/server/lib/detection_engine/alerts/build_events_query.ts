/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

interface BuildEventsSearchQuery {
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  searchAfterSortId?: string;
}

export const getFilter = (kql: string | undefined, filter: Record<string, {}> | undefined) => {
  if (kql != null) {
    return toElasticsearchQuery(fromKueryExpression(kql), null);
  } else if (filter != null) {
    return filter;
  } else {
    // TODO: Re-visit this error (which should never happen) when we do signal errors for the UI
    throw new TypeError('either kql or filter should be set');
  }
};

export const buildEventsSearchQuery = ({
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
}: BuildEventsSearchQuery) => {
  const filterWithTime = [
    filter,
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      gte: from,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          {
            bool: {
              should: [
                {
                  range: {
                    '@timestamp': {
                      lte: to,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  ];
  const searchQuery = {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            ...[filterWithTime],
            {
              match_all: {},
            },
          ],
        },
      },
      track_total_hits: true,
      sort: [
        {
          '@timestamp': {
            order: 'asc',
          },
        },
      ],
    },
  };
  if (searchAfterSortId) {
    return {
      ...searchQuery,
      body: {
        ...searchQuery.body,
        search_after: [searchAfterSortId],
      },
    };
  }
  return searchQuery;
};
