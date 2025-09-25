/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postClusterRequestParamsRT,
  postClusterRequestPayloadRT,
  postClusterResponsePayloadRT,
} from '../../../../../common/http_api/cluster';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { handleError } from '../../../../lib/errors';
import type { MonitoringCore } from '../../../../types';

const mockClusters = [
  {"cluster_uuid":"9HiBinviQNalkR2Cauq5iw","cluster_name":"My deployment (22b5a7)","version":"9.1.4","license":{"status":"active","type":"enterprise","expiry_date_in_millis":1835481599999},"elasticsearch":{"cluster_stats":{"indices":{"count":51,"docs":{"count":4360},"shards":{"total":102,"primaries":51},"store":{"size_in_bytes":17803692}},"nodes":{"fs":{"total_in_bytes":493921239040,"available_in_bytes":493885562880},"count":{"total":3},"jvm":{"max_uptime_in_millis":478755,"mem":{"heap_max_in_bytes":8640266240,"heap_used_in_bytes":1984305288}}},"status":"green"},"logs":{"enabled":true,"types":[{"type":"server","levels":[{"level":"info","count":89},{"level":"warn","count":52}]}]}},"logstash":{},"kibana":{"status":null,"some_status_is_stale":true,"requests_total":0,"concurrent_connections":0,"response_time_max":0,"memory_size":0,"memory_limit":0,"count":0,"rules":{"cluster":null,"instance":null}},"ml":{"jobs":0},"beats":{"totalEvents":0,"bytesSent":0,"beats":{"total":0,"types":[]}},"apm":{"totalEvents":0,"memRss":53977088,"apms":{"total":1},"versions":["9.1.4"],"config":{"container":true}},"enterpriseSearch":{"clusterUuid":"9HiBinviQNalkR2Cauq5iw","stats":{"appSearchEngines":0,"workplaceSearchOrgSources":0,"workplaceSearchPrivateSources":0,"totalInstances":0,"uptime":0,"memUsed":0,"memCommitted":0,"memTotal":0,"versions":[]}},"isPrimary":false,"status":"green","isCcrEnabled":true}
];

export function clusterRoute(server: MonitoringCore) {
  /*
   * Cluster Overview
   */

  const validateParams = createValidationFunction(postClusterRequestParamsRT);
  const validateBody = createValidationFunction(postClusterRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
    security: {
      authz: {
        enabled: false,
        reason: 'This route delegates authorization to the scoped ES cluster client',
      },
    },
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    handler: async (req) => {
      const options = {
        clusterUuid: req.params.clusterUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
        codePaths: req.payload.codePaths,
      };

      try {
        return mockClusters;
        // const clusters = await getClustersFromRequest(req, options);
        // return postClusterResponsePayloadRT.encode(clusters);
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
