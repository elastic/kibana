/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext, Logger } from 'src/core/server';
import { ServerFacade } from './types';
import { initServerWithKibana } from './kibana.index';

export class Plugin {
  name = 'siem';
  private logger: Logger;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get('plugins', this.name);

    this.logger.info('NP plugin initialized');
  }

  public setup(core: CoreSetup, dependencies: {}, __legacy: ServerFacade) {
    this.logger.info('NP plugin setup');

    initServerWithKibana(__legacy);
  }
}
