/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import { registerContextEngineWorkflowSteps } from './workflow_steps';

export interface ContextEnginePublicPluginSetupDeps {
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePublicPluginStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePublicPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePublicPluginStart {}

/**
 * Browser-side plugin for the Context Engine.
 *
 * Currently only used to surface workflow step editor metadata (label,
 * description, icon, schemas) to the Workflows Extensions registry so the
 * `contextEngine.addEntry` step can be added from the workflow editor. The
 * runtime handler lives on the server.
 */
export class ContextEnginePublicPlugin
  implements
    Plugin<
      ContextEnginePublicPluginSetup,
      ContextEnginePublicPluginStart,
      ContextEnginePublicPluginSetupDeps,
      ContextEnginePublicPluginStartDeps
    >
{
  constructor(_context: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<ContextEnginePublicPluginStartDeps, ContextEnginePublicPluginStart>,
    deps: ContextEnginePublicPluginSetupDeps
  ): ContextEnginePublicPluginSetup {
    if (deps.workflowsExtensions) {
      registerContextEngineWorkflowSteps(deps.workflowsExtensions);
    }
    return {};
  }

  public start(
    _coreStart: CoreStart,
    _deps: ContextEnginePublicPluginStartDeps
  ): ContextEnginePublicPluginStart {
    return {};
  }

  public stop() {}
}
