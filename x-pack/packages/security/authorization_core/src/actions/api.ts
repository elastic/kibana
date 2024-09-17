/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { ApiActions as ApiActionsType } from '@kbn/security-plugin-types-server';
import { ApiOperation } from '@kbn/security-plugin-types-server';

export class ApiActions implements ApiActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `api:`;
  }

  private isValidOperation(operation: string): operation is ApiOperation {
    return operation in ApiOperation;
  }
  public actionFromRouteTag(routeTag: string) {
    const [operation, subject] = routeTag.split('_');
    if (!this.isValidOperation(operation)) {
      throw new Error('operation is required and must be a valid ApiOperation');
    }
    return this.get(operation, subject);
  }

  public get(operation: ApiOperation, subject: string) {
    if (!this.isValidOperation(operation)) {
      throw new Error('operation is required and must be a valid ApiOperation');
    }
    if (!subject || !isString(subject)) {
      throw new Error('subject is required and must be a string');
    }

    return `${this.prefix}${operation}_${subject}`;
  }
}
