/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { readSignals } from './read_signals';

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

export const updateSignal = async ({
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
  // TODO: Error handling and abstraction. Right now if this is an error then what happens is we get the error of
  // "message": "Saved object [alert/{id}] not found"

  const signal = await readSignals({ alertsClient, id });

  /*
  alertsClient.update({
    id,
    data: {
      interval,
      actions: signal.actions,
    },
  });
  */
  return signal;
  /*
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
          },
        },
      ],
      throttle: null,
    },
  });
  */
};
