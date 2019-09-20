/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertAction, State, Context } from '../types';
import { ActionsPlugin } from '../../../actions';
import { transformActionParams } from './transform_action_params';

interface CreateExecutionHandlerOptions {
  alertId: string;
  executeAction: ActionsPlugin['execute'];
  actions: AlertAction[];
  spaceId: string;
  apiKey?: string;
}

interface ExecutionHandlerOptions {
  actionGroup: string;
  alertInstanceId: string;
  context: Context;
  state: State;
}

export function createExecutionHandler({
  alertId,
  executeAction,
  actions: alertActions,
  spaceId,
  apiKey,
}: CreateExecutionHandlerOptions) {
  return async ({ actionGroup, context, state, alertInstanceId }: ExecutionHandlerOptions) => {
    const actions = alertActions
      .filter(({ group }) => group === actionGroup)
      .map(action => {
        return {
          ...action,
          params: transformActionParams({
            alertId,
            alertInstanceId,
            context,
            params: action.params,
            state,
          }),
        };
      });
    for (const action of actions) {
      await executeAction({
        id: action.id,
        params: action.params,
        spaceId,
        apiKey,
      });
    }
  };
}
