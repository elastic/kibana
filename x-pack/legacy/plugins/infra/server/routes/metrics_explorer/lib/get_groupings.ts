/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject, set } from 'lodash';
import { InfraDatabaseSearchResponse } from '../../../lib/adapters/framework';
import { MetricsExplorerRequestBody, MetricsExplorerResponse } from '../types';

interface GroupingAggregation {
  groupingsCount: {
    value: number;
  };
  groupings: {
    after_key?: {
      [name: string]: string;
    };
    buckets: Array<{ key: { [id: string]: string }; doc_count: number }>;
  };
}

const EMPTY_RESPONSE = {
  series: [{ id: 'ALL', columns: [], rows: [] }],
  pageInfo: { total: 0, afterKey: null },
};

export const getGroupings = async (
  search: <Aggregation>(options: object) => Promise<InfraDatabaseSearchResponse<{}, Aggregation>>,
  options: MetricsExplorerRequestBody
): Promise<MetricsExplorerResponse> => {
  if (!options.groupBy) {
    return EMPTY_RESPONSE;
  }
  const limit = options.limit || 9;
  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: {
        bool: {
          should: [
            ...options.metrics
              .filter(m => m.field)
              .map(m => ({
                exists: { field: m.field },
              })),
          ],
          filter: [
            {
              range: {
                [options.timerange.field]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ] as object[],
        },
      },
      aggs: {
        groupingsCount: {
          cardinality: { field: options.groupBy },
        },
        groupings: {
          composite: {
            size: limit,
            sources: [{ groupBy: { terms: { field: options.groupBy, order: 'asc' } } }],
          },
        },
      },
    },
  };

  if (params.body.query.bool.should.length !== 0) {
    set(params, 'body.query.bool.minimum_should_match', 1);
  }

  if (options.afterKey) {
    set(params, 'body.aggs.groupings.composite.after', { groupBy: options.afterKey });
  }

  if (options.filterQuery) {
    try {
      const filterObject = JSON.parse(options.filterQuery);
      if (isObject(filterObject)) {
        params.body.query.bool.filter.push(filterObject);
      }
    } catch (err) {
      params.body.query.bool.filter.push({
        query_string: {
          query: options.filterQuery,
          analyze_wildcard: true,
        },
      });
    }
  }

  const response = await search<GroupingAggregation>(params);
  if (response.hits.total.value === 0) {
    return { ...EMPTY_RESPONSE, series: [] };
  }
  if (!response.aggregations) {
    throw new Error('Aggregations should be present.');
  }
  const { groupings, groupingsCount } = response.aggregations;
  const { after_key: afterKey } = groupings;
  return {
    series: groupings.buckets.map(bucket => {
      return { id: bucket.key.groupBy, rows: [], columns: [] };
    }),
    pageInfo: {
      total: groupingsCount.value,
      afterKey: afterKey && groupings.buckets.length === limit ? afterKey.groupBy : null,
    },
  };
};
