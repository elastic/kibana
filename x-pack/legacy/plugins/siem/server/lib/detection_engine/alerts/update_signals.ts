/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults } from 'lodash/fp';
import { AlertAction } from '../../../../../alerting/server/types';
import { readSignals } from './read_signals';
import { UpdateSignalParams } from './types';

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

export const calculateName = ({
  updatedName,
  originalName,
}: {
  updatedName: string | undefined;
  originalName: string | undefined;
}): string => {
  if (updatedName != null) {
    return updatedName;
  } else if (originalName != null) {
    return originalName;
  } else {
    // You really should never get to this point. This is a fail safe way to send back
    // the name of "untitled" just in case a signal rule name became null or undefined at
    // some point since TypeScript allows it.
    return 'untitled';
  }
};

export const updateSignal = async ({
  alertsClient,
  actionsClient, // TODO: Use this whenever we add feature support for different action types
  description,
  enabled,
  query,
  language,
  savedId,
  filters,
  filter,
  from,
  id,
  index,
  interval,
  maxSignals,
  name,
  severity,
  to,
  type,
  references,
}: UpdateSignalParams) => {
  // TODO: Error handling and abstraction. Right now if this is an error then what happens is we get the error of
  // "message": "Saved object [alert/{id}] not found"
  const signal = await readSignals({ alertsClient, id });

  // TODO: Remove this as cast as soon as signal.actions TypeScript bug is fixed
  // where it is trying to return AlertAction[] or RawAlertAction[]
  const actions = (signal.actions as AlertAction[] | undefined) || [];

  const alertTypeParams = signal.alertTypeParams || {};

  const nextAlertTypeParams = defaults(
    {
      ...alertTypeParams,
    },
    {
      description,
      filter,
      from,
      query,
      language,
      savedId,
      filters,
      index,
      maxSignals,
      severity,
      to,
      type,
      references,
    }
  );

  if (signal.enabled && !enabled) {
    await alertsClient.disable({ id: signal.id });
  } else if (!signal.enabled && enabled) {
    await alertsClient.enable({ id: signal.id });
  }

  return alertsClient.update({
    id: signal.id,
    data: {
      name: calculateName({ updatedName: name, originalName: signal.name }),
      interval: calculateInterval(interval, signal.interval),
      actions,
      alertTypeParams: nextAlertTypeParams,
    },
  });
};
