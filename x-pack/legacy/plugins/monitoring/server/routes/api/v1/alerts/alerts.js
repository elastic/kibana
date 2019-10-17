/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { isFunction } from 'lodash';
import { ALERT_TYPE_LICENSE_EXPIRATION } from '../../../../../common/constants';

async function createAlerts(alertsClient, { selectedEmailActionId, clusterUuid }) {
  const createdAlerts = [];

  // Create alerts
  const ALERT_TYPES = {
    [ALERT_TYPE_LICENSE_EXPIRATION]: {
      alertTypeParams: {
        clusterUuid,
      },
      actions: [
        {
          group: 'default',
          id: selectedEmailActionId,
          params: {
            subject: '{{context.subject}}',
            message: `{{context.message}}`,
            to: ['{{context.to}}']
          }
        }
      ]
    }
  };

  for (const alertTypeId of Object.keys(ALERT_TYPES)) {
    const result = await alertsClient.create({
      data: {
        enabled: true,
        interval: '1m',
        alertTypeId,
        ...ALERT_TYPES[alertTypeId],
      }
    });
    createdAlerts.push(result);
  }

  return createdAlerts;
}


export function createKibanaAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/alerts',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        }),
        payload: Joi.object({
          selectedEmailActionId: Joi.string().required(),
        })
      }
    },
    async handler(req, headers) {
      const alertsClient = isFunction(req.getAlertsClient) ? req.getAlertsClient() : null;
      if (!alertsClient) {
        return headers.response().code(404);
      }

      const alerts = await createAlerts(alertsClient, { ...req.params, ...req.payload });
      return { alerts };
    }
  });
}
