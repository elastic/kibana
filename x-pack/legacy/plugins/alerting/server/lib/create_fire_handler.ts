/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertAction, State, Context } from '../types';
import { ActionsPlugin } from '../../../actions';
import { transformActionParams } from './transform_action_params';

interface CreateFireHandlerOptions {
  fireAction: ActionsPlugin['fire'];
  actions: AlertAction[];
  spaceId: string;
}

export function createFireHandler({
  fireAction,
  actions: alertActions,
  spaceId,
}: CreateFireHandlerOptions) {
  return async (actionGroup: string, context: Context, state: State) => {
    const actions = alertActions
      .filter(({ group }) => group === actionGroup)
      .map(action => {
        return {
          ...action,
          params: transformActionParams(action.params, state, context),
        };
      });
    for (const action of actions) {
      await fireAction({
        id: action.id,
        params: action.params,
        spaceId,
      });
    }
  };
}
