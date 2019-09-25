/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { createRoute } from './create_route';
import { createAlert } from '../lib/alerting/error_occurrence/create_alert';

export const errorOccurrenceAlertRoute = createRoute(core => ({
  path: '/api/apm/alerts/error_occurrence',
  method: 'POST',
  params: {
    body: t.type({
      serviceName: t.string,
      threshold: t.number,
      actions: t.type({
        email: t.string,
        slack: t.string
      }),
      interval: t.string
    })
  },
  handler: async (req, { body }, h) => {
    const alertsClient =
      typeof req.getAlertsClient === 'function' ? req.getAlertsClient() : null;

    const actionsClient =
      typeof req.getActionsClient === 'function'
        ? req.getActionsClient()
        : null;

    if (!alertsClient || !actionsClient) {
      return h.response().code(404);
    }

    return createAlert({ alertsClient, actionsClient }, body);
  }
}));
