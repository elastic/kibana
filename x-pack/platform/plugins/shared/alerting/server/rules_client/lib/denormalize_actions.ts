/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectReference } from '@kbn/core/server';
import {
  preconfiguredConnectorActionRefPrefix,
  systemConnectorActionRefPrefix,
} from '../common/constants';
import {
  DenormalizedAction,
  NormalizedAlertActionWithGeneratedValues,
  RulesClientContext,
} from '../types';

export async function denormalizeActions(
  context: RulesClientContext,
  alertActions: NormalizedAlertActionWithGeneratedValues[]
): Promise<{ actions: DenormalizedAction[]; references: SavedObjectReference[] }> {
  const references: SavedObjectReference[] = [];
  const actions: DenormalizedAction[] = [];

  if (alertActions.length) {
    const actionsClient = await context.getActionsClient();
    const actionIds = [...new Set(alertActions.map((alertAction) => alertAction.id))];

    const actionResults = await actionsClient.getBulk({
      ids: actionIds,
      throwIfSystemAction: false,
    });

    const actionTypeIds = [...new Set(actionResults.map((action) => action.actionTypeId))];

    actionTypeIds.forEach((id) => {
      // Notify action type usage via "isActionTypeEnabled" function
      actionsClient.isActionTypeEnabled(id, { notifyUsage: true });
    });

    alertActions.forEach(({ id, ...alertAction }, i) => {
      const actionResultValue = actionResults.find((action) => action.id === id);

      if (actionResultValue) {
        if (actionsClient.isPreconfigured(id)) {
          actions.push({
            ...alertAction,
            actionRef: `${preconfiguredConnectorActionRefPrefix}${id}`,
            actionTypeId: actionResultValue.actionTypeId,
          });
        } else if (actionsClient.isSystemAction(id)) {
          actions.push({
            ...alertAction,
            actionRef: `${systemConnectorActionRefPrefix}${id}`,
            actionTypeId: actionResultValue.actionTypeId,
          });
        } else {
          const actionRef = `action_${i}`;

          references.push({
            id,
            name: actionRef,
            type: 'action',
          });

          actions.push({
            ...alertAction,
            actionRef,
            actionTypeId: actionResultValue.actionTypeId,
          });
        }
      } else {
        actions.push({
          ...alertAction,
          actionRef: '',
          actionTypeId: '',
        });
      }
    });
  }
  return {
    actions,
    references,
  };
}
