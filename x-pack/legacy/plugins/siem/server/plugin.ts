/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext, Logger } from 'src/core/server';

export class Plugin {
  name = 'siem';
  private logger: Logger;

  constructor({ logger }: Pick<PluginInitializerContext, 'logger'>) {
    this.logger = logger.get('plugins', this.name);

    this.logger.info('NP plugin initialized');
  }

  public setup(core: Partial<CoreSetup>, dependencies: {}) {
    this.logger.info('NP plugin setup');
  }
}
