/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  postNodeSetupStatusRequestParamsRT,
  postNodeSetupStatusRequestPayloadRT,
  postNodeSetupStatusRequestQueryRT,
  postNodeSetupStatusResponsePayloadRT,
} from '../../../../../common/http_api/setup';
import { createValidationFunction } from '../../../../lib/create_route_validation_function';
import { verifyMonitoringAuth } from '../../../../lib/elasticsearch/verify_monitoring_auth';
import { handleError } from '../../../../lib/errors';
import { getCollectionStatus } from '../../../../lib/setup/collection';
import { MonitoringCore } from '../../../../types';

export function nodeSetupStatusRoute(server: MonitoringCore) {
  /*
   * Monitoring Home
   * Route Init (for checking license and compatibility for multi-cluster monitoring
   */

  const validateParams = createValidationFunction(postNodeSetupStatusRequestParamsRT);
  const validateQuery = createValidationFunction(postNodeSetupStatusRequestQueryRT);
  const validateBody = createValidationFunction(postNodeSetupStatusRequestPayloadRT);

  server.route({
    method: 'post',
    path: '/api/monitoring/v1/setup/collection/node/{nodeUuid}',
    validate: {
      params: validateParams,
      query: validateQuery,
      body: validateBody,
    },
    options: {
      access: 'internal',
    },
    handler: async (req) => {
      const nodeUuid = req.params.nodeUuid;
      const skipLiveData = req.query.skipLiveData;

      // NOTE using try/catch because checkMonitoringAuth is expected to throw
      // an error when current logged-in user doesn't have permission to read
      // the monitoring data. `try/catch` makes it a little more explicit.
      try {
        await verifyMonitoringAuth(req);
        const status = await getCollectionStatus(req, undefined, nodeUuid, skipLiveData);
        return postNodeSetupStatusResponsePayloadRT.encode(status);
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
