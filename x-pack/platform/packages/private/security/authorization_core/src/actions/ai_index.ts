/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { AiIndexActions as AiIndexActionsType } from '@kbn/security-plugin-types-server';

export class AiIndexActions implements AiIndexActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `ai_index:`;
  }

  public read(kiType: string): string {
    if (!kiType || !isString(kiType)) {
      throw new Error('kiType is required and must be a string');
    }

    return `${this.prefix}${kiType}/read`;
  }
}
