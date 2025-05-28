/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientContext } from '../actions_client';
import type { ActionExecutionSourceType } from './action_execution_source';
import type { ExecuteOptions } from './action_executor';

export function getActionKibanaPrivileges(
  context: ActionsClientContext,
  actionTypeId?: string,
  params?: ExecuteOptions['params'],
  source?: ActionExecutionSourceType
) {
  const additionalPrivileges =
    actionTypeId &&
    (context.actionTypeRegistry.isSystemActionType(actionTypeId) ||
      context.actionTypeRegistry.hasSubFeature(actionTypeId))
      ? context.actionTypeRegistry.getActionKibanaPrivileges(actionTypeId, params, source)
      : [];

  return additionalPrivileges;
}
