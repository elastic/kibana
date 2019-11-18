/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, EnvironmentMode, PluginInitializerContext, Logger } from 'src/core/server';
import { ServerFacade } from './types';
import { initServerWithKibana } from './kibana.index';

export class Plugin {
  name = 'siem';
  private mode: EnvironmentMode;
  private logger: Logger;

  constructor({ env, logger }: PluginInitializerContext) {
    this.logger = logger.get('plugins', this.name);
    this.mode = env.mode;

    this.logger.info('NP plugin initialized');
  }

  public setup(core: CoreSetup, dependencies: {}, __legacy: ServerFacade) {
    this.logger.info('NP plugin setup');

    initServerWithKibana(__legacy, this.logger, this.mode);

    this.logger.info('NP plugin setup complete');
  }
}
