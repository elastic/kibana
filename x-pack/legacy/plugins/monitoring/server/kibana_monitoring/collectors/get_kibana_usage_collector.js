/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, snakeCase } from 'lodash';
import { KIBANA_USAGE_TYPE, KIBANA_STATS_TYPE_MONITORING } from '../../../common/constants';

const TYPES = [
  'dashboard',
  'visualization',
  'search',
  'index-pattern',
  'graph-workspace',
  'timelion-sheet',
];

/**
 * Fetches saved object counts by querying the .kibana index
 */
export function getKibanaUsageCollector(server) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_USAGE_TYPE,
    isReady: () => true,
    async fetch(callCluster) {
      const index = server.config().get('kibana.index');
      const savedObjectCountSearchParams = {
        index,
        ignoreUnavailable: true,
        filterPath: 'aggregations.types.buckets',
        body: {
          size: 0,
          query: {
            terms: { type: TYPES },
          },
          aggs: {
            types: {
              terms: { field: 'type', size: TYPES.length }
            }
          }
        }
      };

      const resp = await callCluster('search', savedObjectCountSearchParams);
      const buckets = get(resp, 'aggregations.types.buckets', []);

      // get the doc_count from each bucket
      const bucketCounts = buckets.reduce((acc, bucket) => ({
        ...acc,
        [bucket.key]: bucket.doc_count,
      }), {});

      return {
        index,
        ...TYPES.reduce((acc, type) => ({ // combine the bucketCounts and 0s for types that don't have documents
          ...acc,
          [snakeCase(type)]: {
            total: bucketCounts[type] || 0
          }
        }), {})
      };
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage namespace of the data payload (usage.index, etc)
     */
    formatForBulkUpload: result => {
      return {
        type: KIBANA_STATS_TYPE_MONITORING,
        payload: {
          usage: result
        }
      };
    }
  });
}
