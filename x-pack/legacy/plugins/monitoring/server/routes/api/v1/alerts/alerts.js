/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { isFunction } from 'lodash';
import { ALERT_ACTION_TYPE_EMAIL, ALERT_TYPE_LICENSE_EXPIRATION } from '../../../../../common/constants';

async function createAlerts(actionsClient, alertsClient, { clusterUuid }) {

  // Create actions
  const ACTION_TYPES = {
    [ALERT_ACTION_TYPE_EMAIL]: {
      description: 'Sends an email',
      config: {
        service: 'Gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        from: 'Friendly Monitoring Cluster :)'
      },
      secrets: {
        user: 'my.email@email.com',
        password: 'mypassword',
      },
    }
  };

  for (const actionTypeId of Object.keys(ACTION_TYPES)) {
    const { id } = await actionsClient.create({
      action: {
        actionTypeId,
        ...ACTION_TYPES[actionTypeId]
      },
    });
    ACTION_TYPES[actionTypeId].id = id;
  }

  // Create alerts
  const ALERT_TYPES = {
    [ALERT_TYPE_LICENSE_EXPIRATION]: {
      alertTypeParams: {
        clusterUuid,
      },
      actions: [
        {
          group: 'default',
          id: ACTION_TYPES[ALERT_ACTION_TYPE_EMAIL].id,
          params: {
            subject: '{{context.subject}}',
            message: `{{context.message}}`,
            to: ['my.email@email.com']
          }
        }
      ]
    }
  };

  for (const alertTypeId of Object.keys(ALERT_TYPES)) {
    const result = await alertsClient.create({
      data: {
        enabled: true,
        interval: '10s',
        alertTypeId,
        ...ALERT_TYPES[alertTypeId],
      }
    });
    console.log(`Created alert ${result.id}`);
  }
}

export function createKibanaAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/clusters/{clusterUuid}/alerts',
    config: {
      validate: {
        params: Joi.object({
          clusterUuid: Joi.string().required()
        })
      }
    },
    async handler(req, headers) {
      // const config = server.config();
      const clusterUuid = req.params.clusterUuid;

      const alertsClient = isFunction(req.getAlertsClient) ? req.getAlertsClient() : null;
      const actionsClient = isFunction(req.getActionsClient) ? req.getActionsClient() : null;
      if (!alertsClient || !actionsClient) {
        return headers.response().code(404);
      }

      await createAlerts(actionsClient, alertsClient, { clusterUuid });
      return { success: true };
    }
  });
}
