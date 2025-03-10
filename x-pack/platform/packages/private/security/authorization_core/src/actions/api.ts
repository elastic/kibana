/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import { ApiOperation } from '@kbn/security-plugin-types-common';
import type { ApiActions as ApiActionsType } from '@kbn/security-plugin-types-server';

export class ApiActions implements ApiActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `api:`;
  }

  private isValidOperation(operation: string): operation is ApiOperation {
    return Object.values(ApiOperation).includes(operation as ApiOperation);
  }
  public actionFromRouteTag(routeTag: string) {
    const [operation, subject] = routeTag.split('_');
    if (!this.isValidOperation(operation)) {
      throw new Error('operation is required and must be a valid ApiOperation');
    }
    return this.get(operation, subject);
  }

  public get(operation: string | ApiOperation, subject?: string) {
    if (arguments.length === 1) {
      if (!isString(operation) || !operation) {
        throw new Error('operation is required and must be a string');
      }
      return `${this.prefix}${operation}`;
    }

    if (!isString(subject) || !subject) {
      throw new Error('subject is required and must be a string');
    }

    if (!this.isValidOperation(operation)) {
      throw new Error('operation is required and must be a valid ApiOperation');
    }

    return `${this.prefix}${operation}_${subject}`;
  }
}
