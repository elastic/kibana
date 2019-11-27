/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginInitializerContext, Logger } from 'src/core/server';
import { initServer } from './init_server';
import { compose } from './lib/compose/kibana';

export class Plugin {
  readonly name = 'siem';
  private readonly logger: Logger;
  private context: PluginInitializerContext;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', this.name);

    this.logger.debug('Shim plugin initialized');
  }

  public setup(core: CoreSetup, plugins: {}) {
    this.logger.debug('Shim plugin setup');
    const version = this.context.env.packageInfo.version;

    const libs = compose(core, version);
    initServer(libs);
  }
}
