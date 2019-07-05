/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';

export class AppActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `app:${versionNumber}:`;
  }

  public get all(): string {
    return `${this.prefix}*`;
  }

  public get(appId: string) {
    if (!appId || !isString(appId)) {
      throw new Error('appId is required and must be a string');
    }

    return `${this.prefix}${appId}`;
  }
}
