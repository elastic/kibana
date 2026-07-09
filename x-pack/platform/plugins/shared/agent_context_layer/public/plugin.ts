/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginSetupDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginStart {}

export class AgentContextLayerPublicPlugin
  implements
    Plugin<
      AgentContextLayerPublicPluginSetup,
      AgentContextLayerPublicPluginStart,
      AgentContextLayerPublicPluginSetupDeps,
      AgentContextLayerPublicPluginStartDeps
    >
{
  constructor(_context: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<AgentContextLayerPublicPluginStartDeps, AgentContextLayerPublicPluginStart>,
    _deps: AgentContextLayerPublicPluginSetupDeps
  ): AgentContextLayerPublicPluginSetup {
    return {};
  }

  public start(
    _coreStart: CoreStart,
    _deps: AgentContextLayerPublicPluginStartDeps
  ): AgentContextLayerPublicPluginStart {
    return {};
  }

  public stop() {}
}
