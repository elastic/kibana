/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

interface BuildEventsScrollQuery {
  index: string[];
  from: string;
  to: string;
  kql: string | undefined;
  filter: Record<string, {}> | undefined;
  size: number;
  scroll: string;
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

export const buildEventsScrollQuery = ({
  index,
  from,
  to,
  kql,
  filter,
  size,
  scroll,
}: BuildEventsScrollQuery) => {
  const kqlOrFilter = getFilter(kql, filter);
  const filterWithTime = [
    kqlOrFilter,
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
