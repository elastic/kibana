/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { setCollectionDisabled } from '../../../../lib/elasticsearch_settings/set/collection_disabled';

export function disableElasticsearchInternalCollectionRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/setup/collection/{clusterUuid}/disable_internal_collection',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required(),
        }),
      },
    },
    handler: async req => {
      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        await setCollectionDisabled(req);
      } catch (err) {
        throw handleError(err, req);
      }
      return null;
    },
  });
}
