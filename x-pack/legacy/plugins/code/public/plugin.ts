/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart } from 'src/core/public';
import { startApp } from './app';

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    // called when plugin is setting up
  }

  public start(core: CoreStart) {
    // called after all plugins are set up
    startApp(core);
  }

  public stop() {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}
