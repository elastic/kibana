/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ParseNotification } from '../../../connectors';
import { casesConnectors } from '../../../connectors';

/**
 * Reads the connector as the caller and returns its notification parser. Throws a 400 for a
 * connector type that cannot notify Kibana, which is anything but Jira or ServiceNow.
 */
export const getNotificationParser = async (
  actionsClient: PublicMethodsOf<ActionsClient>,
  connectorId: string
): Promise<ParseNotification> => {
  const { actionTypeId } = await actionsClient.get({ id: connectorId });
  const parseNotification = casesConnectors.get(actionTypeId)?.parseNotification;

  if (parseNotification == null) {
    throw Boom.badRequest(
      `Connector type ${actionTypeId} cannot send incident changes to cases. Use a Jira or ServiceNow connector.`
    );
  }

  return parseNotification;
};
