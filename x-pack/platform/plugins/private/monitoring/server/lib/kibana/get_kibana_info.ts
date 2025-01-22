/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { ElasticsearchResponse } from '../../../common/types/es';
import { Globals } from '../../static_globals';
import { LegacyRequest } from '../../types';
import { getIndexPatterns, getKibanaDataset } from '../../../common/get_index_patterns';
import { MissingRequiredError } from '../error_missing_required';
import { buildKibanaInfo } from './build_kibana_info';
import { isKibanaStatusStale } from './is_kibana_status_stale';
import { createQuery } from '../create_query';
import { KibanaMetric } from '../metrics';

export function handleResponse(resp: ElasticsearchResponse) {
  const hit = resp.hits?.hits[0];
  const legacySource = hit?._source.kibana_stats;
  const mbSource = hit?._source.kibana?.stats;
  const lastSeenTimestamp = hit?._source['@timestamp'] ?? legacySource?.timestamp;
  if (!lastSeenTimestamp) {
    throw new MissingRequiredError('timestamp');
  }

  return merge(buildKibanaInfo(hit!), {
    statusIsStale: isKibanaStatusStale(lastSeenTimestamp),
    lastSeenTimestamp,
    os_memory_free: mbSource?.os?.memory?.free_in_bytes ?? legacySource?.os?.memory?.free_in_bytes,
    uptime: mbSource?.process?.uptime?.ms ?? legacySource?.process?.uptime_in_millis,
  });
}

export function getKibanaInfo(
  req: LegacyRequest,
  { clusterUuid, kibanaUuid }: { clusterUuid: string; kibanaUuid: string }
) {
  const moduleType = 'kibana';
  const type = 'kibana_stats';
  const dataset = 'stats';
  const indexPatterns = getIndexPatterns({
    config: Globals.app.config,
    ccs: req.payload.ccs,
    moduleType,
    dataset,
  });
  const params = {
    index: indexPatterns,
    size: 1,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.kibana_stats.kibana',
      'hits.hits._source.kibana.stats',
      'hits.hits._source.kibana_stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana.stats.os.memory.free_in_bytes',
      'hits.hits._source.kibana_stats.process.uptime_in_millis',
      'hits.hits._source.kibana.stats.process.uptime.ms',
      'hits.hits._source.kibana_stats.timestamp',
      'hits.hits._source.@timestamp',
      'hits.hits._source.service.id',
      'hits.hits._source.service.version',
    ],
    body: {
      query: createQuery({
        type,
        dsDataset: getKibanaDataset(dataset),
        metricset: dataset,
        clusterUuid,
        uuid: kibanaUuid,
        metric: KibanaMetric.getMetricFields(),
      }),
      collapse: { field: 'kibana_stats.kibana.uuid' },
      sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return callWithRequest(req, 'search', params).then(handleResponse);
}
