/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, merge } from 'lodash';
import { checkParam } from '../error_missing_required';
import { calculateAvailability } from '../calculate_availability';

export function handleResponse(resp) {
  const source = get(resp, 'hits.hits[0]._source.kibana_stats');
  const kibana = get(source, 'kibana');
  return merge(kibana, {
    availability: calculateAvailability(get(source, 'timestamp')),
    os_memory_free: get(source, 'os.memory.free_in_bytes'),
    uptime: get(source, 'process.uptime_in_millis'),
  });
}

export function getKibanaInfo(req, kbnIndexPattern, { clusterUuid, kibanaUuid }) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in getKibanaInfo');

  const params = {
    index: kbnIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.kibana_stats.kibana',
      'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana_stats.process.uptime_in_millis',
      'hits.hits._source.kibana_stats.timestamp',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { cluster_uuid: clusterUuid } },
            { term: { 'kibana_stats.kibana.uuid': kibanaUuid } },
          ],
        },
      },
      collapse: { field: 'kibana_stats.kibana.uuid' },
      sort: [{ timestamp: { order: 'desc' } }],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
