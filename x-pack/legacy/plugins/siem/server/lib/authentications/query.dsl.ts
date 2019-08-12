/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap, sourceFieldsMap } from '../ecs_fields';
import { extendMap } from '../ecs_fields/extend_map';
import { RequestOptionsPaginated } from '../framework';

export const auditdFieldsMap: Readonly<Record<string, string>> = {
  latest: '@timestamp',
  'lastSuccess.timestamp': 'lastSuccess.@timestamp',
  'lastFailure.timestamp': 'lastFailure.@timestamp',
  ...{ ...extendMap('lastSuccess', sourceFieldsMap) },
  ...{ ...extendMap('lastSuccess', hostFieldsMap) },
  ...{ ...extendMap('lastFailure', sourceFieldsMap) },
  ...{ ...extendMap('lastFailure', hostFieldsMap) },
};

export const buildQuery = ({
  fields,
  filterQuery,
  timerange: { from, to },
  pagination: { querySize },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestOptionsPaginated) => {
  const esFields = reduceFields(fields, { ...hostFieldsMap, ...sourceFieldsMap });

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'event.category': 'authentication' } },
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const agg = {
    user_count: {
      cardinality: {
        field: 'user.name',
      },
    },
  };

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_users: {
          terms: {
            size: querySize,
            field: 'user.name',
            order: [{ 'successes.doc_count': 'desc' }, { 'failures.doc_count': 'desc' }],
          },
          aggs: {
            failures: {
              filter: {
                term: {
                  'event.type': 'authentication_failure',
                },
              },
              aggs: {
                lastFailure: {
                  top_hits: {
                    size: 1,
                    _source: esFields,
                    sort: [{ '@timestamp': { order: 'desc' } }],
                  },
                },
              },
            },
            successes: {
              filter: {
                term: {
                  'event.type': 'authentication_success',
                },
              },
              aggs: {
                lastSuccess: {
                  top_hits: {
                    size: 1,
                    _source: esFields,
                    sort: [{ '@timestamp': { order: 'desc' } }],
                  },
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
    track_total_hits: false,
  };

  return dslQuery;
};
