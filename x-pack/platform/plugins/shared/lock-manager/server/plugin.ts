/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { LockManagerStartDeps, LockManagerSetupDeps } from './types';

export type LockManagerPluginSetup = ReturnType<LockManagerPlugin['setup']>;
export type LockManagerPluginStart = ReturnType<LockManagerPlugin['start']>;

export class LockManagerPlugin
  implements
    Plugin<
      LockManagerPluginSetup,
      LockManagerPluginStart,
      LockManagerSetupDeps,
      LockManagerStartDeps
    >
{
  constructor(initializerContext: PluginInitializerContext) {}
  public setup(core: CoreSetup, plugins: LockManagerSetupDeps) {}

  public start(core: CoreStart, plugins: LockManagerStartDeps) {}
}
