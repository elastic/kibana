/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { ApiActions as ApiActionsType } from '@kbn/security-plugin-types-server';

export class ApiActions implements ApiActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `api:`;
  }

  public get(operation: string) {
    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `${this.prefix}${operation}`;
  }
}
