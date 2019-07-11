/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

const getAggs = (agentType: 'auditbeat' | 'winlogbeat' | 'filebeat') => {
  return {
    [agentType]: {
      filter: {
        bool: {
          should: [
            {
              match: {
                'agent.type': agentType,
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    },
  };
};
export const buildBeatsIngestAnalyticsHostQuery = ({
  filterQuery,
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getAggs('auditbeat'),
        ...getAggs('winlogbeat'),
        ...getAggs('filebeat'),
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
