/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '../../../common/http_api/shared';
import { ElasticsearchResponse } from '../../../common/types/es';
import { Globals } from '../../static_globals';
import { Cluster, LegacyRequest } from '../../types';
import { getIndexPatterns } from '../../../common/get_index_patterns';
import { EnterpriseSearchMetric } from '../metrics';
import { createEnterpriseSearchQuery } from './create_enterprise_search_query';
import {
  entSearchAggFilterPath,
  entSearchAggResponseHandler,
  entSearchUuidsAgg,
} from './_enterprise_search_stats';

function handleResponse(clusterUuid: string, response: ElasticsearchResponse) {
  const stats = entSearchAggResponseHandler(response);

  return {
    clusterUuid,
    stats,
  };
}

export function getEnterpriseSearchForClusters(
  req: LegacyRequest<unknown, unknown, { timeRange?: TimeRange }>,
  clusters: Cluster[],
  ccs: string
) {
  const start = req.payload.timeRange?.min;
  const end = req.payload.timeRange?.max;
  const config = req.server.config;
  const maxBucketSize = config.ui.max_bucket_size;

  const indexPatterns = getIndexPatterns({
    moduleType: 'enterprisesearch',
    ccs,
    config: Globals.app.config,
  });

  return Promise.all(
    clusters.map(async (cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const params = {
        index: indexPatterns,
        size: 0,
        ignore_unavailable: true,
        filter_path: entSearchAggFilterPath,
        body: {
          query: createEnterpriseSearchQuery({
            start,
            end,
            uuid: clusterUuid,
            metric: EnterpriseSearchMetric.getMetricFields(),
          }),
          aggs: entSearchUuidsAgg(maxBucketSize),
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      const response = await callWithRequest(req, 'search', params);
      return handleResponse(clusterUuid, response);
    })
  );
}
