/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  ServerlessPluginSetup,
  ServerlessPluginSetupDependencies,
  ServerlessPluginStart,
  ServerlessPluginStartDependencies,
} from './types';
export declare class ServerlessPlugin
  implements
    Plugin<
      ServerlessPluginSetup,
      ServerlessPluginStart,
      ServerlessPluginSetupDependencies,
      ServerlessPluginStartDependencies
    >
{
  constructor();
  setup(_core: CoreSetup, _dependencies: ServerlessPluginSetupDependencies): ServerlessPluginSetup;
  start(core: CoreStart, dependencies: ServerlessPluginStartDependencies): ServerlessPluginStart;
  stop(): void;
}
