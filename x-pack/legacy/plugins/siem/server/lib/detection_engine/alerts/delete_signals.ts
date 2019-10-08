/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RawAlertAction, AlertAction } from '../../../../../alerting/server/types';
import { ActionsClient } from '../../../../../actions/server/actions_client';
import { AlertsClient } from '../../../../../alerting/server/alerts_client';

export interface DeleteSignalParams {
  alertsClient: AlertsClient;
  actionsClient: ActionsClient;
  id: string;
}

interface ObjectWithId {
  id: AlertAction['id'];
}

export const isObjectWithId = (obj: unknown): obj is ObjectWithId => {
  return Object.getOwnPropertyDescriptor(obj, 'id') != null;
};

export const getObjectsWithId = (actions: unknown[] = []): ObjectWithId[] => {
  return actions.reduce<ObjectWithId[]>((accum, current) => {
    if (isObjectWithId(current)) {
      return [...accum, current];
    } else {
      return accum;
    }
  }, []);
};

export const deleteAllSignalActions = async (
  actionsClient: ActionsClient,
  actions: RawAlertAction[] | AlertAction[] | undefined
): Promise<Error | null> => {
  const actionsWithIds = getObjectsWithId(actions);
  try {
    await Promise.all(actionsWithIds.map(async ({ id }) => actionsClient.delete({ id })));
    return null;
  } catch (error) {
    return error;
  }
};

export const deleteSignals = async ({ alertsClient, actionsClient, id }: DeleteSignalParams) => {
  const alert = await alertsClient.get({ id });
  const actionsErrors = await deleteAllSignalActions(actionsClient, alert.actions);
  const deletedAlert = alertsClient.delete({ id });
  if (actionsErrors != null) {
    throw actionsErrors;
  } else {
    return deletedAlert;
  }
};
