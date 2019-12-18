/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AlertTypeModel } from '../types';

export class AlertTypeRegistry {
  private readonly alertTypes: Map<string, AlertTypeModel> = new Map();

  public has(id: string) {
    return this.alertTypes.has(id);
  }

  public register(alertType: AlertTypeModel) {
    if (this.has(alertType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.triggersActionsUI.alertTypeRegistry.register.duplicateAlertTypeError',
          {
            defaultMessage: 'Alert type "{id}" is already registered.',
            values: {
              id: alertType.id,
            },
          }
        )
      );
    }
    this.alertTypes.set(alertType.id, alertType);
  }

  public get(id: string): AlertTypeModel | null {
    if (!this.has(id)) {
      return null;
    }
    return this.alertTypes.get(id)!;
  }

  public list() {
    return Array.from(this.alertTypes).map(([alertTypeId, alertType]) => alertType);
  }
}
