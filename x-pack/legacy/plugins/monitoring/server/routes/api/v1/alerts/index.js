/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { alertsClusterSearch } from '../../../../cluster_alerts/alerts_cluster_search';
import { checkLicense } from '../../../../cluster_alerts/check_license';
import { getClusterLicense } from '../../../../lib/cluster/get_cluster_license';
import { prefixIndexPattern } from '../../../../lib/ccs_utils';
import { INDEX_PATTERN_ELASTICSEARCH, INDEX_ALERTS } from '../../../../../common/constants';

/*
 * Cluster Alerts route.
 */
export function clusterAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/alerts',
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
        }),
      },
    },
    handler(req) {
      const config = server.config();
      const ccs = req.payload.ccs;
      const clusterUuid = req.params.clusterUuid;
      const esIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_ELASTICSEARCH, ccs);
      const alertsIndex = prefixIndexPattern(config, INDEX_ALERTS, ccs);
      const options = {
        start: req.payload.timeRange.min,
        end: req.payload.timeRange.max,
      };

      return getClusterLicense(req, esIndexPattern, clusterUuid).then(license =>
        alertsClusterSearch(
          req,
          alertsIndex,
          { cluster_uuid: clusterUuid, license },
          checkLicense,
          options
        )
      );
    },
  });
}
