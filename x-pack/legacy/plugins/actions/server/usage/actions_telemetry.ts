/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsTelemetry, ActionsTelemetrySavedObject } from './types';

export const ACTIONS_TELEMETRY_DOC_ID = 'actions-telemetry';

export function createActionsTelemetry(
  executionsTotal: number = 0,
  executionsByActionType: Record<string, number> = {}
): ActionsTelemetry {
  return {
    executions_total: executionsTotal,
    excutions_count_by_type: executionsByActionType,
  };
}
// savedObjects
export function storeActionsTelemetry(
  savedObjectsClient: any,
  actionsTelemetry: ActionsTelemetry
): void {
  savedObjectsClient.create('actions-telemetry', actionsTelemetry, {
    id: ACTIONS_TELEMETRY_DOC_ID,
    overwrite: true,
  });
}

export async function incrementActionExecutionsCount(
  savedObjectsClient: any,
  actionTypeId: string
): Promise<void> {
  try {
    const { attributes } = await savedObjectsClient.get('telemetry', 'telemetry');
    if (attributes.enabled === false) {
      return;
    }
  } catch (error) {
    // if we aren't allowed to get the telemetry document,
    // we assume we couldn't opt in to telemetry and won't increment the index count.
    return;
  }

  let executionsTotal = 1;
  let executionsByActionTypes = {};

  try {
    const { attributes } = (await savedObjectsClient.get(
      'actions-telemetry',
      ACTIONS_TELEMETRY_DOC_ID
    )) as ActionsTelemetrySavedObject;
    executionsTotal = attributes.executions_total + 1;
    const executionsByActionType = attributes.excutions_count_by_type[actionTypeId]
      ? attributes.excutions_count_by_type[actionTypeId]
      : 0;
    executionsByActionTypes = {
      ...attributes.excutions_count_by_type,
      [actionTypeId]: executionsByActionType + 1,
    };
  } catch (e) {
    /* silently fail, this will happen if the saved object doesn't exist yet. */
  }

  const actionsTelemetry = createActionsTelemetry(executionsTotal, executionsByActionTypes);
  storeActionsTelemetry(savedObjectsClient, actionsTelemetry);
}
