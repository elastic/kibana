/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertAction } from '../../../../../alerting/server/types';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { readSignals } from './read_signals';
import { DeleteSignalParams } from './types';

export const deleteAllSignalActions = async (
  actionsClient: ActionsClient,
  actions: AlertAction[]
): Promise<Error | null> => {
  try {
    await Promise.all(actions.map(async ({ id }) => actionsClient.delete({ id })));
    return null;
  } catch (error) {
    return error;
  }
};

export const deleteSignals = async ({ alertsClient, actionsClient, id }: DeleteSignalParams) => {
  const signal = await readSignals({ alertsClient, id });

  // TODO: Remove this as cast as soon as signal.actions TypeScript bug is fixed
  // where it is trying to return AlertAction[] or RawAlertAction[]
  const actions = (signal.actions as (AlertAction[] | undefined)) || [];

  const actionsErrors = await deleteAllSignalActions(actionsClient, actions);
  const deletedAlert = await alertsClient.delete({ id: signal.id });
  if (actionsErrors != null) {
    throw actionsErrors;
  } else {
    return deletedAlert;
  }
};
