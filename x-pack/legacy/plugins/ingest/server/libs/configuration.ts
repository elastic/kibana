/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ConfigAdapter } from './adapters/configurations/default';

export class ConfigurationLib {
  constructor(private readonly adapter: ConfigAdapter) {}

  public async rollForward(id: string): Promise<{ id: string; version: number }> {
    this.adapter.get(id);
    return {
      id: 'fsdfsdf',
      version: 0,
    };
  }
}
