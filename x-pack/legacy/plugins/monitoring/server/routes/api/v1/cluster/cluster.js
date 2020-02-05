/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { getClustersFromRequest } from '../../../../lib/cluster/get_clusters_from_request';
import { handleError } from '../../../../lib/errors';
import { getIndexPatterns } from '../../../../lib/cluster/get_index_patterns';
import { verifyCcsAvailability } from '../../../../lib/elasticsearch/verify_ccs_availability';

export function clusterRoute(server) {
  /*
   * Cluster Overview
   */
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
        }),
        payload: Joi.object({
          ccs: Joi.string().optional(),
          timeRange: Joi.object({
            min: Joi.date().required(),
            max: Joi.date().required(),
          }).required(),
          codePaths: Joi.array()
            .items(Joi.string().required())
            .required(),
        }),
      },
    },
    handler: async req => {
      await verifyCcsAvailability(req);
      const config = server.config();

      const indexPatterns = getIndexPatterns(server, {
        filebeatIndexPattern: config.get('monitoring.ui.logs.index'),
      });
      const options = {
        clusterUuid: req.params.clusterUuid,
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
        codePaths: req.payload.codePaths,
      };

      return getClustersFromRequest(req, indexPatterns, options).catch(err =>
        handleError(err, req)
      );
    },
  });
}
