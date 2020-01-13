/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { cloneDeep, sortByOrder } from 'lodash';
import { UIFilters } from '../../../../typings/ui-filters';
import { Projection } from '../../../../common/projections/typings';
import { PromiseReturnType } from '../../../../typings/common';
import { getLocalFilterQuery } from './get_local_filter_query';
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

  return Promise.all(
    localFilterNames.map(async name => {
      const query = getLocalFilterQuery({
        indexPattern: dynamicIndexPattern,
        uiFilters,
        projection,
        localUIFilterName: name
      });

      const response = await client.search(query);

      const filter = localUIFilters[name];

      return {
        ...filter,
        options: sortByOrder(
          response.aggregations?.by_terms.buckets.map(bucket => {
            return {
              name: bucket.key as string,
              count:
                'bucket_count' in bucket
                  ? bucket.bucket_count.value
                  : bucket.doc_count
            };
          }) || [],
          'count',
          'desc'
        )
      };
    })
  );
}
