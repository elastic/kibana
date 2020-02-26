/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginsSetup } from './shim';
import { functions } from '../canvas_plugin_src/functions/server';

export class Plugin {
  public setup(core: CoreSetup, plugins: PluginsSetup) {
    plugins.interpreter.register({ serverFunctions: functions });
  }
}
