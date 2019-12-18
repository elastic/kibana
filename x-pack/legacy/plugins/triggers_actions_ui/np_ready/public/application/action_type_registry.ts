/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionTypeModel } from '../types';

export class ActionTypeRegistry {
  private readonly actionTypes: Map<string, ActionTypeModel> = new Map();

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(actionType: ActionTypeModel) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: actionType.id,
            },
          }
        )
      );
    }
    this.actionTypes.set(actionType.id, actionType);
  }

  /**
   * Returns an action type, null if not registered
   */
  public get(id: string): ActionTypeModel | null {
    if (!this.has(id)) {
      return null;
    }
    return this.actionTypes.get(id)!;
  }

  public list() {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => actionType);
  }
}
