/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { AlertingActions as AlertingActionsType } from '@kbn/security-plugin-types-server';

export class AlertingActions implements AlertingActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `alerting:`;
  }

  public get(
    ruleTypeId: string,
    consumer: string,
    alertingEntity: string,
    operation: string
  ): string {
    if (!ruleTypeId || !isString(ruleTypeId)) {
      throw new Error('ruleTypeId is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    if (!consumer || !isString(consumer)) {
      throw new Error('consumer is required and must be a string');
    }

    if (!alertingEntity || !isString(alertingEntity)) {
      throw new Error('alertingEntity is required and must be a string');
    }

    return `${this.prefix}${ruleTypeId}/${consumer}/${alertingEntity}/${operation}`;
  }

  /**
   * Checks if the action is a valid alerting action.
   * @param action The action string to check.
   */
  public isValid(action: string) {
    return action.startsWith(this.prefix);
  }
}
