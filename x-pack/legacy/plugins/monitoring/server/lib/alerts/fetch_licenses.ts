/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertLicense, AlertCluster } from '../../alerts/types';
import { INDEX_PATTERN_ELASTICSEARCH } from '../../../common/constants';

export async function fetchLicenses(
  callCluster: any,
  clusters: AlertCluster[]
): Promise<AlertLicense[]> {
  const params = {
    index: INDEX_PATTERN_ELASTICSEARCH,
    filterPath: [
      'hits.hits._source.license.*',
      'hits.hits._source.cluster_uuid',
      'hits.hits._source.cluster_name',
    ],
    body: {
      size: 1,
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clusters.map(cluster => cluster.clusterUuid),
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
  return get<any>(response, 'hits.hits').map((hit: any) => {
    const rawLicense: any = get(hit, '_source.license', {});
    const license: AlertLicense = {
      status: rawLicense.status,
      type: rawLicense.type,
      expiryDateMS: rawLicense.expiry_date_in_millis,
      clusterUuid: get(hit, '_source.cluster_uuid'),
      clusterName: get(hit, '_source.cluster_name') || get(hit, '_source.cluster_uuid'),
    };
    return license;
  });
}
