/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface BaseObjectType {
  id: string;
}

export class TypeRegistry<T extends BaseObjectType> {
  private readonly objectTypes: Map<string, T> = new Map();

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.objectTypes.has(id);
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(objectType: T) {
    if (this.has(objectType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: objectType.id,
            },
          }
        )
      );
    }
    this.objectTypes.set(objectType.id, objectType);
  }

  /**
   * Returns an action type, null if not registered
   */
  public get(id: string): T | null {
    if (!this.has(id)) {
      return null;
    }
    return this.objectTypes.get(id)!;
  }

  public list() {
    return Array.from(this.objectTypes).map(([id, objectType]) => objectType);
  }
}
