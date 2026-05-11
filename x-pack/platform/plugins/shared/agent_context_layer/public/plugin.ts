/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import {
  AGENT_CONTEXT_LAYER_APP_ID,
  AGENT_CONTEXT_LAYER_FEATURE_ID,
  uiCapabilities,
} from '../common/features';
import { registerAgentContextLayerWorkflowSteps } from './workflow_steps';

export interface AgentContextLayerPublicPluginSetupDeps {
  management: ManagementSetup;
  workflowsExtensions?: WorkflowsExtensionsPublicPluginSetup;
}

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
  private managementApp?: ManagementApp;

  constructor(_context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<AgentContextLayerPublicPluginStartDeps, AgentContextLayerPublicPluginStart>,
    deps: AgentContextLayerPublicPluginSetupDeps
  ): AgentContextLayerPublicPluginSetup {
    if (deps.workflowsExtensions) {
      registerAgentContextLayerWorkflowSteps(deps.workflowsExtensions);
    }

    // Surface the Agent Context Layer admin page under Stack Management →
    // AI. Listing it here (rather than as a top-level Kibana app) reflects
    // its operator-oriented nature: it is gated by an independent
    // `manageSystemWorkflows` sub-feature privilege and exposes start /
    // stop / cancel controls for `sml--` system workflows that run as the
    // Kibana service account.
    this.managementApp = deps.management.sections.section.ai.registerApp({
      id: AGENT_CONTEXT_LAYER_APP_ID,
      title: i18n.translate('xpack.agentContextLayer.management.title', {
        defaultMessage: 'Agent Context Layer',
      }),
      order: 5,
      keywords: ['agent', 'context', 'sml', 'workflows', 'ai'],
      async mount(params) {
        const [coreStart] = await core.getStartServices();
        const canManage =
          coreStart.application.capabilities?.[AGENT_CONTEXT_LAYER_FEATURE_ID]?.[
            uiCapabilities.manageSystemWorkflows
          ] === true;
        const { renderApp } = await import('./system_workflows/render_app');
        return renderApp({ coreStart, params, canManage });
      },
    });

    // Disable by default — `start()` re-enables it once we have confirmed
    // the user holds the `manageSystemWorkflows` UI capability. Without
    // this gate, every user with any Stack Management access would see
    // the entry, even though hitting it would return the unauthorized
    // empty prompt.
    this.managementApp.disable();

    return {};
  }

  public start(
    coreStart: CoreStart,
    _deps: AgentContextLayerPublicPluginStartDeps
  ): AgentContextLayerPublicPluginStart {
    const canManage =
      coreStart.application.capabilities?.[AGENT_CONTEXT_LAYER_FEATURE_ID]?.[
        uiCapabilities.manageSystemWorkflows
      ] === true;
    if (this.managementApp && canManage) {
      this.managementApp.enable();
    }
    return {};
  }

  public stop() {}
}
