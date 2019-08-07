/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import { cloneDeep, sortByOrder } from 'lodash';
import { mergeProjection } from '../../../../public/projections/util/merge_projection';
import { UIFilters } from '../../../../typings/ui-filters';
import { Projection } from '../../../../public/projections/typings';
import { PromiseReturnType } from '../../../../typings/common';
import { getFilterAggregations } from './get_filter_aggregations';
import { Setup } from '../../helpers/setup_request';
import { localUIFilters, LocalUIFilterName, TERM_COUNT_LIMIT } from './config';

export type LocalUIFiltersAPIResponse = PromiseReturnType<
  typeof getLocalUIFilters
>;

export async function getLocalUIFilters({
  server,
  setup,
  projection,
  uiFilters,
  localFilterNames
}: {
  server: Server;
  setup: Setup;
  projection: Projection;
  uiFilters: UIFilters;
  localFilterNames: LocalUIFilterName[];
}) {
  const { client } = setup;

  const projectionWithoutAggs = cloneDeep(projection);

  delete projectionWithoutAggs.body.aggs;

  const filterAggregations = await getFilterAggregations({
    server,
    uiFilters,
    projection,
    localFilterNames
  });

  const params = mergeProjection(projectionWithoutAggs, {
    body: {
      size: 0,
      // help TS infer aggregations by making all aggregations required
      aggs: filterAggregations as Required<typeof filterAggregations>
    }
  });

  const response = await client.search(params);

  return localFilterNames.map(key => {
    const aggregations = response.aggregations[key];
    const filter = localUIFilters[key];

    return {
      ...filter,
      options: sortByOrder(
        aggregations.by_terms.buckets.map(bucket => {
          let count;

          if ('count' in bucket) {
            count =
              bucket.count.buckets.length >= TERM_COUNT_LIMIT
                ? `${TERM_COUNT_LIMIT}+`
                : bucket.count.buckets.length.toString();
          } else {
            count = bucket.doc_count.toString();
          }

          return {
            name: bucket.key,
            count
          };
        }),
        'count',
        'desc'
      )
    };
  });
}
