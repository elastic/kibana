/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SIGNALS_ID } from '../../../../common/constants';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';

export interface SignalParams {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
  description: string;
  from: string;
  id: string;
  index: string[];
  interval: string;
  enabled: boolean;
  filter: Record<string, {}> | undefined;
  kql: string | undefined;
  maxSignals: string;
  name: string;
  severity: number;
  type: string; // TODO: Replace this type with a static enum type
  to: string;
  references: string[];
}

export const createSignal = async ({
  alertsClient,
  actionsClient,
  description,
  enabled,
  filter,
  from,
  id,
  index,
  interval,
  kql,
  name,
  severity,
  to,
  type,
  references,
}: SignalParams) => {
  // TODO: Right now we are using the .server-log as the default action as each alert has to have
  // at least one action or it will not be able to do in-memory persistence. When adding in actions
  // such as email, slack, etc... this should be the default action if not action is specified to
  // create signals

  const actionResults = await actionsClient.create({
    action: {
      actionTypeId: '.server-log',
      description: 'SIEM Alerts Log',
      config: {},
      secrets: {},
    },
  });

  return alertsClient.create({
    data: {
      alertTypeId: SIGNALS_ID,
      alertTypeParams: {
        description,
        id,
        index,
        from,
        filter,
        kql,
        name,
        severity,
        to,
        type,
        references,
      },
      interval,
      enabled,
      actions: [
        {
          group: 'default',
          id: actionResults.id,
          params: {
            message: 'SIEM Alert Fired',
            level: 'info',
          },
        },
      ],
      throttle: null,
    },
  });
};
