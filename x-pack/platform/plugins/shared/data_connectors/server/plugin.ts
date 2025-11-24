/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type {
  DataConnectorsServerSetup,
  DataConnectorsServerSetupDependencies,
  DataConnectorsServerStart,
  DataConnectorsServerStartDependencies,
} from './types';
import { registerUISettings } from './register';

export class DataConnectorsServerPlugin
  implements
    Plugin<
      DataConnectorsServerSetup,
      DataConnectorsServerStart,
      DataConnectorsServerSetupDependencies,
      DataConnectorsServerStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(core: CoreSetup): DataConnectorsServerSetup {
    const { uiSettings } = core;
    registerUISettings({ uiSettings });
    return {};
  }
  start(core: CoreStart): DataConnectorsServerStart {
    return {};
  }
}
