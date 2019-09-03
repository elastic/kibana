/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reduceFields } from '../../utils/build_query/reduce_fields';
import { cloudFieldsMap, hostFieldsMap } from '../ecs_fields';

import { buildFieldsTermAggregation } from './helpers';
import { HostOverviewRequestOptions } from './types';

export const buildHostOverviewQuery = ({
  fields,
  hostName,
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: HostOverviewRequestOptions) => {
  const esFields = reduceFields(fields, { ...hostFieldsMap, ...cloudFieldsMap });

  const filter = [
    { term: { 'host.name': hostName } },
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
        ...buildFieldsTermAggregation(esFields.filter(field => !['@timestamp'].includes(field))),
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
