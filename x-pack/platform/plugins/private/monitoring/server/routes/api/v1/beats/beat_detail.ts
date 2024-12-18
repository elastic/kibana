/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postBeatDetailRequestParamsRT,
  postBeatDetailRequestPayloadRT,
  postBeatDetailResponsePayloadRT,
} from '../../../../../common/http_api/beats';
import { getBeatSummary } from '../../../../lib/beats';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { getMetrics } from '../../../../lib/details/get_metrics';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../../common/get_index_patterns';
import { MonitoringCore } from '../../../../types';
import { metricSet } from './metric_set_detail';

export function beatsDetailRoute(server: MonitoringCore) {
  const validateParams = createValidationFunction(postBeatDetailRequestParamsRT);
  const validateBody = createValidationFunction(postBeatDetailRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/beats/beat/{beatUuid}',
    validate: {
      params: validateParams,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    async handler(req) {
      const clusterUuid = req.params.clusterUuid;
      const beatUuid = req.params.beatUuid;
      const config = server.config;
      const ccs = req.payload.ccs;
      const beatsIndexPattern = getIndexPatterns({
        ccs,
        config,
        moduleType: 'beats',
      });

      const summaryOptions = {
        clusterUuid,
        beatUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
      };

      try {
        const [summary, metrics] = await Promise.all([
          getBeatSummary(req, beatsIndexPattern, summaryOptions),
          getMetrics(req, 'beats', metricSet, [{ term: { 'beats_stats.beat.uuid': beatUuid } }]),
        ]);

        return postBeatDetailResponsePayloadRT.encode({
          summary,
          metrics,
        });
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
