/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

export interface AgentBuilderSmlPublicPluginSetupDeps {}

export interface AgentBuilderSmlPublicPluginStartDeps {}

export interface AgentBuilderSmlPublicPluginSetup {}

export interface AgentBuilderSmlPublicPluginStart {}

export class AgentBuilderSmlPublicPlugin
  implements
    Plugin<
      AgentBuilderSmlPublicPluginSetup,
      AgentBuilderSmlPublicPluginStart,
      AgentBuilderSmlPublicPluginSetupDeps,
      AgentBuilderSmlPublicPluginStartDeps
    >
{
  constructor(_context: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<AgentBuilderSmlPublicPluginStartDeps, AgentBuilderSmlPublicPluginStart>,
    _deps: AgentBuilderSmlPublicPluginSetupDeps
  ): AgentBuilderSmlPublicPluginSetup {
    return {};
  }

  public start(
    _coreStart: CoreStart,
    _deps: AgentBuilderSmlPublicPluginStartDeps
  ): AgentBuilderSmlPublicPluginStart {
    return {};
  }

  public stop() {}
}
