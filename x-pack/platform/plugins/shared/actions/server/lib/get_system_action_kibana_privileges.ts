/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClientContext } from '../actions_client';
import { ExecuteOptions } from './action_executor';

export function getSystemActionKibanaPrivileges(
  context: ActionsClientContext,
  connectorId: string,
  params?: ExecuteOptions['params']
) {
  const inMemoryConnector = context.inMemoryConnectors.find(
    (connector) => connector.id === connectorId
  );

  const additionalPrivileges = inMemoryConnector?.isSystemAction
    ? context.actionTypeRegistry.getSystemActionKibanaPrivileges(
        inMemoryConnector.actionTypeId,
        params
      )
    : [];

  return additionalPrivileges;
}
