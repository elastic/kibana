/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { get } from 'lodash';

/*
 * Cluster Alerts route.
 */
export function clusterAlertMigrationStatusRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/migration_status',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
        }),
      },
    },
    async handler(req) {
      // const config = server.config();
      // const clusterUuid = req.params.clusterUuid;

      // Check exporters
      const exporters = [];
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
      const response = await callWithRequest(req, 'transport.request', {
        method: 'GET',
        path: '/_cluster/settings?include_defaults',
        filter_path: [
          'persistent.xpack.monitoring',
          'transient.xpack.monitoring',
          'defaults.xpack.monitoring',
        ],
      });
      const sources = ['persistent', 'transient', 'defaults'];
      for (const source of sources) {
        const exporter = get(response[source], 'xpack.monitoring.exporters');
        if (exporter) {
          exporters.push(exporter);
        }
      }

      return {
        needToDisableWatches: exporters.length > 0,
      };
    },
  });
}
