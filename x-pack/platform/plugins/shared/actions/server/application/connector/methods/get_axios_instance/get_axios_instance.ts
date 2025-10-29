/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { AxiosInstance } from 'axios';
import type { RawAction } from '../../../../types';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import type { ActionsClientContext } from '../../../../actions_client';
import type { ConnectorExecuteParams } from '../execute/types';

export async function getAxiosInstance(
  context: ActionsClientContext,
  connectorExecuteParams: ConnectorExecuteParams
): Promise<AxiosInstance> {
  const log = context.logger;
  const { actionId, params, source, relatedSavedObjects } = connectorExecuteParams;
  let actionTypeId: string | undefined;

  try {
    const { attributes } = await context.unsecuredSavedObjectsClient.get<RawAction>(
      ACTION_SAVED_OBJECT_TYPE,
      actionId
    );

    actionTypeId = attributes.actionTypeId;
  } catch (err) {
    log.debug(`Failed to retrieve actionTypeId for action [${actionId}]`, err);
  }

  // No authorization atm
  return context.actionExecutor.getAxiosInstance({
    actionId,
    params,
    source,
    request: context.request,
    relatedSavedObjects,
    actionExecutionId: uuidv4(),
  });
}
