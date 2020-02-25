/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkClusterSettings } from '../../../../../lib/elasticsearch_settings';
import { handleSettingsError } from '../../../../../lib/errors';

/*
 * Cluster Settings Check Route
 */
export function clusterSettingsCheckRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/monitoring/v1/elasticsearch_settings/check/cluster',
    config: {
      validate: {},
    },
    async handler(req) {
      try {
        const response = await checkClusterSettings(req); // needs to be try/catch to handle privilege error
        return response;
      } catch (err) {
        throw handleSettingsError(err);
      }
    },
  });
}
