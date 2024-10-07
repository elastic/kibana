/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { SavedObjectActions as SavedObjectActionsType } from '@kbn/security-plugin-types-server';

export class SavedObjectActions implements SavedObjectActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `saved_object:`;
  }

  public get(type: string, operation: string): string {
    if (!type || !isString(type)) {
      throw new Error('type is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `${this.prefix}${type}/${operation}`;
  }
}
