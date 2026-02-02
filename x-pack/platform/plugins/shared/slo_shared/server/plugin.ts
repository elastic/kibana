/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { sloTemplate } from './saved_objects';
import type { SloSharedPluginSetup, SloSharedPluginStart } from './types';

export class SloSharedPlugin implements Plugin<SloSharedPluginSetup, SloSharedPluginStart> {
  constructor(initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): SloSharedPluginSetup {
    core.savedObjects.registerType(sloTemplate);

    return {};
  }

  public start(core: CoreStart): SloSharedPluginStart {
    return {};
  }

  public stop() {}
}
