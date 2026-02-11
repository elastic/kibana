/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigSchema } from '../../server/config';

type Config = Omit<ConfigSchema, 'enableExperimental'>;

export class ConfigService {
  private static config?: Config;

  public static init({ config }: { config: Config }) {
    this.config = config;
  }

  public static get(): Config {
    if (!this.config) {
      this.throwUninitializedError();
    }

    return this.config;
  }

  private static throwUninitializedError(): never {
    throw new Error(
      'Config service not initialized - are you trying to import this module from outside of the stack connectors?'
    );
  }
}
