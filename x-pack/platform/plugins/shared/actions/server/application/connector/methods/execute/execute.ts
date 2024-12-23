/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { RawAction, ActionTypeExecutorResult } from '../../../../types';
import { getSystemActionKibanaPrivileges } from '../../../../lib/get_system_action_kibana_privileges';
import { isPreconfigured } from '../../../../lib/is_preconfigured';
import { isSystemAction } from '../../../../lib/is_system_action';
import { ConnectorExecuteParams } from './types';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { ActionsClientContext } from '../../../../actions_client';

export async function execute(
  context: ActionsClientContext,
  connectorExecuteParams: ConnectorExecuteParams
): Promise<ActionTypeExecutorResult<unknown>> {
  const log = context.logger;
  const { actionId, params, source, relatedSavedObjects } = connectorExecuteParams;
  const additionalPrivileges = getSystemActionKibanaPrivileges(context, actionId, params);
  let actionTypeId: string | undefined;

  try {
    if (isPreconfigured(context, actionId) || isSystemAction(context, actionId)) {
      const connector = context.inMemoryConnectors.find(
        (inMemoryConnector) => inMemoryConnector.id === actionId
      );

      actionTypeId = connector?.actionTypeId;
    } else {
      const { attributes } = await context.unsecuredSavedObjectsClient.get<RawAction>(
        ACTION_SAVED_OBJECT_TYPE,
        actionId
      );

      actionTypeId = attributes.actionTypeId;
    }
  } catch (err) {
    log.debug(`Failed to retrieve actionTypeId for action [${actionId}]`, err);
  }

  await context.authorization.ensureAuthorized({
    operation: 'execute',
    additionalPrivileges,
    actionTypeId,
  });

  return context.actionExecutor.execute({
    actionId,
    params,
    source,
    request: context.request,
    relatedSavedObjects,
    actionExecutionId: uuidv4(),
  });
}
