/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { InfraBackendLibs } from '../../lib/infra_types';
import { internalInfraFrameworkRequest } from '../../lib/adapters/framework/adapter_types';
import { infraMetricAlertSavedObjectType } from '../../lib/alerting/saved_object_mappings';

export const initDeleteMetricAlert = ({ framework }: InfraBackendLibs) =>
  framework.registerRoute({
    path: '/api/infra/alerts',
    method: 'DELETE',
    handler: async (req, res) => {
      const internalReq = req[internalInfraFrameworkRequest] as any;
      const alertsClient =
        typeof internalReq.getAlertsClient === 'function' ? internalReq.getAlertsClient() : null;

      if (!alertsClient) {
        return res.response().code(404);
      }

      const savedObjectsClient = framework
        .getSavedObjectsService()
        .getScopedSavedObjectsClient(internalReq);

      const { id } = req.query;

      try {
        const savedAlert = await savedObjectsClient.get(infraMetricAlertSavedObjectType, id);
        if (savedAlert.attributes.childAlerts) {
          for (const alertID of savedAlert.attributes.childAlerts) {
            await alertsClient.delete({ id: alertID });
            await savedObjectsClient.delete(infraMetricAlertSavedObjectType, alertID);
          }
        } else {
          if (savedAlert.attributes.childOf) {
            throw new Boom(
              `Cannot delete the child of a groupBy alert. You must delete the parent alert, which has the ID of ${savedAlert.attributes.childOf})`
            );
          }
          await alertsClient.delete({ id });
        }
        await savedObjectsClient.delete(infraMetricAlertSavedObjectType, id);

        return res.response().code(204);
      } catch (e) {
        if (e && e.output) {
          return res.response(e.output.payload.message).code(e.output.statusCode);
        }
        return res.response(e).code(500);
      }
    },
  });
