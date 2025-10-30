/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { registerApp } from './register';
import type {
  DataConnectorsPluginSetup,
  DataConnectorsPluginSetupDependencies,
  DataConnectorsPluginStart,
  DataConnectorsPluginStartDependencies,
} from './types';

export class DataConnectorsPlugin
  implements
    Plugin<
      DataConnectorsPluginSetup,
      DataConnectorsPluginStart,
      DataConnectorsPluginSetupDependencies,
      DataConnectorsPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}
  setup(
    core: CoreSetup<DataConnectorsPluginStartDependencies, DataConnectorsPluginStart>
  ): DataConnectorsPluginSetup {
    registerApp({ core });

    return {};
  }
  start(core: CoreStart): DataConnectorsPluginStart {
    return {};
  }
}
