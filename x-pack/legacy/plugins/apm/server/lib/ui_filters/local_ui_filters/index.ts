/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, sortByOrder } from 'lodash';
import { mergeProjection } from '../../../../common/projections/util/merge_projection';
import { UIFilters } from '../../../../typings/ui-filters';
import { Projection } from '../../../../common/projections/typings';
import { PromiseReturnType } from '../../../../typings/common';
import { getFilterAggregations } from './get_filter_aggregations';
import { Setup } from '../../helpers/setup_request';
import { localUIFilters, LocalUIFilterName } from './config';

export type LocalUIFiltersAPIResponse = PromiseReturnType<
  typeof getLocalUIFilters
>;

export async function getLocalUIFilters({
  setup,
  projection,
  uiFilters,
  localFilterNames
}: {
  setup: Setup;
  projection: Projection;
  uiFilters: UIFilters;
  localFilterNames: LocalUIFilterName[];
}) {
  const { client, dynamicIndexPattern } = setup;

  const projectionWithoutAggs = cloneDeep(projection);

  delete projectionWithoutAggs.body.aggs;

  const filterAggregations = getFilterAggregations({
    indexPattern: dynamicIndexPattern,
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
  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return localFilterNames.map(key => {
    const aggregationsForFilter = aggregations[key];
    const filter = localUIFilters[key];

    return {
      ...filter,
      options: sortByOrder(
        aggregationsForFilter.by_terms.buckets.map(bucket => {
          return {
            name: bucket.key as string,
            count:
              'bucket_count' in bucket
                ? bucket.bucket_count.value
                : bucket.doc_count
          };
        }),
        'count',
        'desc'
      )
    };
  });
}
