/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster } from '../../alerts/types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';

interface AggregationResult {
  key: string;
}

export async function fetchClusters(callCluster: any): Promise<AlertCluster[]> {
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    filterPath: 'aggregations.clusters.buckets',
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              term: {
                type: 'cluster_stats',
              },
            },
            {
              range: {
                timestamp: {
                  gte: 'now-2m',
                },
              },
            },
          ],
        },
      },
      aggs: {
        clusters: {
          terms: {
            field: 'cluster_uuid',
            size: 1000,
          },
        },
      },
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'aggregations.clusters.buckets', []).map((bucket: AggregationResult) => ({
    cluster_uuid: bucket.key,
  }));
}
