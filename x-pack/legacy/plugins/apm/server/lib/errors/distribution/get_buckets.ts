/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from '../../../../typings/elasticsearch';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../helpers/range_filter';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../helpers/setup_request';

export async function getBuckets({
  serviceName,
  groupId,
  bucketSize,
  setup
}: {
  serviceName: string;
  groupId?: string;
  bucketSize: number;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end, uiFiltersES, client, indices } = setup;
  const filter: ESFilter[] = [
    { term: { [PROCESSOR_EVENT]: 'error' } },
    { term: { [SERVICE_NAME]: serviceName } },
    { range: rangeFilter(start, end) },
    ...uiFiltersES
  ];

  if (groupId) {
    filter.push({ term: { [ERROR_GROUP_ID]: groupId } });
  }

  const params = {
    index: indices['apm_oss.errorIndices'],
    body: {
      size: 0,
      query: {
        bool: {
          filter
        }
      },
      aggs: {
        distribution: {
          histogram: {
            field: '@timestamp',
            min_doc_count: 0,
            interval: bucketSize,
            extended_bounds: {
              min: start,
              max: end
            }
          }
        }
      }
    }
  };

  const resp = await client.search(params);

  const buckets = (resp.aggregations?.distribution.buckets || []).map(
    bucket => ({
      key: bucket.key,
      count: bucket.doc_count
    })
  );

  return {
    noHits: resp.hits.total.value === 0,
    buckets
  };
}
