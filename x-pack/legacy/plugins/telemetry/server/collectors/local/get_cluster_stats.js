/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent to GET /_cluster/stats?timeout=30s.
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The response from Elasticsearch equivalent to GET /_cluster/stats.
 */
export function getClusterStats(callCluster) {
  return callCluster('cluster.stats', {
    timeout: TIMEOUT
  });
}
