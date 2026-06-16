/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerAgentContextLayerWorkflowSteps } from './workflow_steps';

export interface AgentContextLayerPublicPluginSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AgentContextLayerPublicPluginStart {}

/**
 * Browser-side plugin for the Agent Context Layer.
 *
 * Currently only used to surface workflow step editor metadata (label,
 * description, icon, schemas) to the Workflows Extensions registry so the
 * `contextEngine.addEntry` step can be added from the workflow editor. The
 * runtime handler lives on the server.
 */
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
    deps: AgentContextLayerPublicPluginSetupDeps
  ): AgentContextLayerPublicPluginSetup {
    if (deps.workflowsExtensions) {
      registerAgentContextLayerWorkflowSteps(deps.workflowsExtensions);
    }
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
