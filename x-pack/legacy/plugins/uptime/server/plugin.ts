/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { initServerWithKibana } from './kibana.index';
import { KibanaCore, CorePlugins } from './lib/adapters/framework';

export function plugin(initializerContext: PluginInitializerContext) {
  return new Plugin();
}

export class Plugin {
  public setup(core: KibanaCore, plugins: CorePlugins) {
    initServerWithKibana(core, plugins);
  }
}
