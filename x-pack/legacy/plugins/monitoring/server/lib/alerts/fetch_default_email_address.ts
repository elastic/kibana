/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { INDEX_PATTERN_KIBANA } from '../../../common/constants';

export async function fetchDefaultEmailAddress(
  callCluster: any,
  clusterUuid: string
): Promise<string> {
  const params = {
    index: INDEX_PATTERN_KIBANA,
    filterPath: 'hits.hits._source.kibana_settings.xpack.default_admin_email',
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
                type: 'kibana_settings',
              },
            },
          ],
        },
      },
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'hits.hits[0]._source.kibana_settings.xpack.default_admin_email');
}
