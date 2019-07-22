/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ConfigurationLib {
  public async rollForward(
    sharedID: string,
    version?: number
  ): Promise<{ id: string; version: number }> {
    return {
      id: 'fsdfsdf',
      version: 0,
    };
  }
}
