/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { AlertAction } from '../../../../../alerting/server/types';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { readSignals } from './read_signals';

export interface SignalParams {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
  description?: string;
  from?: string;
  id: string;
  index?: string[];
  interval?: string;
  enabled?: boolean;
  filter?: Record<string, {}> | undefined;
  kql?: string | undefined;
  maxSignals?: string;
  name?: string;
  severity?: number;
  type?: string; // TODO: Replace this type with a static enum type
  to?: string;
  references?: string[];
}

export const calculateInterval = (
  interval: string | undefined,
  signalInterval: string | undefined
): string => {
  if (interval != null) {
    return interval;
  } else if (signalInterval != null) {
    return signalInterval;
  } else {
    return '5m';
  }
};

export const calculateKqlAndFilter = (
  kql: string | undefined,
  filter: {} | undefined
): { kql: string | null | undefined; filter: {} | null | undefined } => {
  if (filter != null) {
    return { kql: null, filter };
  } else if (kql != null) {
    return { kql, filter: null };
  } else {
    return { kql: undefined, filter: undefined };
  }
};

export const updateSignal = async ({
  alertsClient,
  actionsClient, // TODO: Use this whenever we add feature support for different action types
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

  // TODO: Remove this as cast as soon as signal.actions TypeScript bug is fixed
  // where it is trying to return AlertAction[] or RawAlertAction[]
  const actions = (signal.actions as AlertAction[] | undefined) || [];

  const alertTypeParams = signal.alertTypeParams || {};

  const { kql: nextKql, filter: nextFilter } = calculateKqlAndFilter(kql, filter);

  const nextAlertTypeParams = defaults(
    {
      ...alertTypeParams,
    },
    {
      description,
      filter: nextFilter,
      from,
      index,
      kql: nextKql,
      name,
      severity,
      to,
      type,
      references,
    }
  );

  if (signal.enabled && !enabled) {
    await alertsClient.disable({ id });
  } else if (!signal.enabled && enabled) {
    await alertsClient.enable({ id });
  }

  return alertsClient.update({
    id,
    data: {
      interval: calculateInterval(interval, signal.interval),
      actions,
      alertTypeParams: nextAlertTypeParams,
    },
  });
};
