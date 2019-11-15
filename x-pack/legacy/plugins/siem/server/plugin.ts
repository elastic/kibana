/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext, Logger } from 'src/core/server';
import { ServerFacade } from './types';
import { initServerWithKibana } from './kibana.index';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface SiemInitializerContext extends Pick<PluginInitializerContext, 'logger'> {}

export interface SiemCoreSetup extends Partial<CoreSetup> {
  __legacy: ServerFacade;
}

export class Plugin {
  name = 'siem';
  private logger: Logger;

  constructor({ logger }: SiemInitializerContext) {
    this.logger = logger.get('plugins', this.name);

    this.logger.info('NP plugin initialized');
  }

  public setup({ __legacy }: SiemCoreSetup, dependencies: {}) {
    this.logger.info('NP plugin setup');

    initServerWithKibana(__legacy);
  }
}
