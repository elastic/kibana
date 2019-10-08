/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendLibs } from '../../lib/infra_types';
import { createAlert, createMultiAlert } from '../../lib/alerting/metric_threshold/create_alert';
import { internalInfraFrameworkRequest } from '../../lib/adapters/framework/adapter_types';

export const initCreateMetricThresholdAlert = ({ framework }: InfraBackendLibs) =>
  framework.registerRoute({
    path: '/api/infra/alerts/metric_threshold',
    method: 'POST',
    handler: async (req, res) => {
      const internalReq = req[internalInfraFrameworkRequest] as any;
      const alertsClient =
        typeof internalReq.getAlertsClient === 'function' ? internalReq.getAlertsClient() : null;

      const actionsClient =
        typeof internalReq.getActionsClient === 'function' ? internalReq.getActionsClient() : null;

      if (!alertsClient || !actionsClient) {
        return res.response().code(404);
      }

      const savedObjectsClient = framework
        .getSavedObjectsService()
        .getScopedSavedObjectsClient(internalReq);

      try {
        if (req.payload.searchField.value === '*') {
          const search = <Aggregation>(searchOptions: object) =>
            framework.callWithRequest<{}, Aggregation>(req, 'search', searchOptions);
          const alertIds = await createMultiAlert(
            search,
            { alertsClient, actionsClient, savedObjectsClient },
            req.payload
          );
          return res.response(alertIds);
        } else {
          const alertId = await createAlert(
            { alertsClient, actionsClient, savedObjectsClient },
            req.payload
          );
          return res.response(alertId);
        }
      } catch (e) {
        if (e && e.output) {
          return res.response(e.output.payload.message).code(e.output.statusCode);
        }
        return res.response(e).code(500);
      }
    },
  });
