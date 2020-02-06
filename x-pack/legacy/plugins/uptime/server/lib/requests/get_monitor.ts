/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';
import { Ping } from '../../../common/graphql/types';
import { INDEX_NAMES } from '../../../common/constants';

export interface GetMonitorParams {
  /** @member monitorId optional limit to monitorId */
  monitorId?: string | null;
}

// Get the monitor meta info regardless of timestamp
export const getMonitor: UMElasticsearchQueryFn<GetMonitorParams, Ping> = async ({
  callES,
  monitorId,
}) => {
  const params = {
    index: INDEX_NAMES.HEARTBEAT,
    body: {
      size: 1,
      _source: ['url', 'monitor', 'observer'],
      query: {
        bool: {
          filter: [
            {
              term: {
                'monitor.id': monitorId,
              },
            },
          ],
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
    },
  };

  const result = await callES('search', params);

  return result.hits.hits[0]?._source;
};
