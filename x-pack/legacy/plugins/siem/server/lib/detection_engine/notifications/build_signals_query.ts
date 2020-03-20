/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BuildSignalsSearchQuery {
  ruleIds?: string[];
  index: string[];
  from: string;
  to: string;
  size?: number;
}

export const buildSignalsSearchQuery = ({
  ruleIds,
  index,
  from,
  to,
  size = 10000,
}: BuildSignalsSearchQuery) => {
  const queryFilter: object[] = [
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  if (ruleIds?.length) {
    queryFilter.push({
      bool: {
        should: ruleIds.map(id => ({
          match: {
            'signal.rule.rule_id': id,
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  return {
    allowNoIndices: true,
    index,
    size,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: queryFilter,
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'asc',
          },
        },
      ],
    },
  };
};
