/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawAction } from '../../../../types';
import { getActionKibanaPrivileges } from '../../../../lib/get_action_kibana_privileges';
import { isPreconfigured } from '../../../../lib/is_preconfigured';
import { isSystemAction } from '../../../../lib/is_system_action';
import type { ConnectorExecuteParams } from './types';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import type { ActionsClientContext } from '../../../../actions_client';
import { AxiosInstance } from 'axios';

type ValidatedSecrets = Record<string, unknown>;

export type GetAxiosInstanceWithAuthFn = (secrets: ValidatedSecrets) => Promise<AxiosInstance>;

export async function getAxiosInstance(
  context: ActionsClientContext,
  connectorExecuteParams: ConnectorExecuteParams
): Promise<AxiosInstance> {
  const log = context.logger;
  const { actionId, params, source } = connectorExecuteParams;
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

  const additionalPrivileges = getActionKibanaPrivileges(
    context,
    actionTypeId,
    params,
    source?.type
  );

  await context.authorization.ensureAuthorized({
    operation: 'execute',
    additionalPrivileges,
    actionTypeId,
  });

  return context.actionExecutor.getAxiosInstance({
    actionId,
    request: context.request,
    getAxiosInstanceWithAuth: context.getAxiosInstanceWithAuth,
  });
}
