/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BuildEventsScrollQuery {
  index: string[];
  from: string;
  to: string;
  filter: unknown;
  size: number;
  scroll: string;
}

export const buildEventsScrollQuery = ({
  index,
  from,
  to,
  filter,
  size,
  scroll,
}: BuildEventsScrollQuery) => {
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
  return {
    allowNoIndices: true,
    index,
    scroll,
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
      track_total_hits: true,
      sort: ['_doc'],
    },
  };
};
