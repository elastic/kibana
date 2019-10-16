/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { License } from '../../alerts/types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';

export async function fetchLicense(callCluster: any, clusterUuid: string): Promise<License> {
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    filterPath: 'hits.hits._source.license.*',
    body: {
      size: 1,
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            {
              term: {
                cluster_uuid: clusterUuid,
              },
            },
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
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'hits.hits[0]._source.license');
}
