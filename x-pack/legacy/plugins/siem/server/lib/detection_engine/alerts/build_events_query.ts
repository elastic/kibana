/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BuildEventsSearchQuery {
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  maxDocs: number | undefined;
  searchAfterSortId: string | number | undefined;
}

export const buildEventsSearchQuery = ({
  index,
  from,
  to,
  filter,
  size,
  maxDocs,
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
            ...filterWithTime,
            {
              match_all: {},
            },
          ],
        },
      },
      // if we have maxDocs, don't utilize track total hits.
      track_total_hits: maxDocs != null ? false : true,
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
