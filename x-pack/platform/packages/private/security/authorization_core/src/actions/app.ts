/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import type { AppActions as AppActionsType } from '@kbn/security-plugin-types-server';

export class AppActions implements AppActionsType {
  private readonly prefix: string;

  constructor() {
    this.prefix = `app:`;
  }

  public get(appId: string) {
    if (!appId || !isString(appId)) {
      throw new Error('appId is required and must be a string');
    }

    return `${this.prefix}${appId}`;
  }
}
