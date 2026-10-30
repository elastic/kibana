/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalAcl } from '@kbn/access-control';
import type { RawAction, ActionTypeExecutorResult } from '../../../../types';
import {
  ensureConnectorOperation,
  getConnectorAccessControl,
} from '../../../../lib/connector_access';
import { getActionKibanaPrivileges } from '../../../../lib/get_action_kibana_privileges';
import { isPreconfigured } from '../../../../lib/is_preconfigured';
import { isSystemAction } from '../../../../lib/is_system_action';
import type { ConnectorExecuteParams } from './types';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import type { ActionsClientContext } from '../../../../actions_client';

export async function execute(
  context: ActionsClientContext,
  connectorExecuteParams: ConnectorExecuteParams
): Promise<ActionTypeExecutorResult<unknown>> {
  const log = context.logger;
  const { actionId, params, source, relatedSavedObjects, signal } = connectorExecuteParams;
  let actionTypeId: string | undefined;
  let acl: CanonicalAcl | undefined;
  const isInMemory = isPreconfigured(context, actionId) || isSystemAction(context, actionId);

  try {
    if (isInMemory) {
      const connector = context.inMemoryConnectors.find(
        (inMemoryConnector) => inMemoryConnector.id === actionId
      );

      actionTypeId = connector?.actionTypeId;
    } else {
      const connector = await context.unsecuredSavedObjectsClient.get<RawAction>(
        ACTION_SAVED_OBJECT_TYPE,
        actionId
      );

      actionTypeId = connector.attributes.actionTypeId;
      acl = connector.acl;
    }
  } catch (err) {
    log.debug(`Failed to retrieve actionTypeId for action [${actionId}]`, err);
    // A stored connector the caller cannot view must not reach the executor, which would only
    // report a failed execution instead of the missing connector.
    if (!isInMemory && getConnectorAccessControl(context)) {
      throw err;
    }
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

  if (!isInMemory) {
    await ensureConnectorOperation(context, { id: actionId, acl, operation: 'use' });
  }

  return context.actionExecutor.execute({
    actionId,
    params,
    source,
    request: context.request,
    spaceId: context.spaceId,
    relatedSavedObjects,
    actionExecutionId: uuidv4(),
    connectorTokenClient: context.connectorTokenClient,
    signal,
  });
}
