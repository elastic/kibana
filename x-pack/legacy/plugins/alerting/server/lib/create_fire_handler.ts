/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server';
import { RawAlertAction, State, Context } from '../types';
import { ActionsPlugin } from '../../../actions';
import { transformActionParams } from './transform_action_params';

interface CreateFireHandlerOptions {
  fireAction: ActionsPlugin['fire'];
  alertSavedObject: SavedObject;
  basePath: string;
}

export function createFireHandler({
  fireAction,
  alertSavedObject,
  basePath,
}: CreateFireHandlerOptions) {
  return async (actionGroup: string, context: Context, state: State) => {
    const alertActions: RawAlertAction[] = alertSavedObject.attributes.actions;
    const actions = alertActions
      .filter(({ group }) => group === actionGroup)
      .map(action => {
        const actionReference = alertSavedObject.references.find(
          obj => obj.name === action.actionRef
        );
        if (!actionReference) {
          throw new Error(
            `Action reference "${action.actionRef}" not found in alert id: ${alertSavedObject.id}`
          );
        }
        return {
          ...action,
          id: actionReference.id,
          params: transformActionParams(action.params, state, context),
        };
      });
    for (const action of actions) {
      await fireAction({
        id: action.id,
        params: action.params,
        basePath,
      });
    }
  };
}
