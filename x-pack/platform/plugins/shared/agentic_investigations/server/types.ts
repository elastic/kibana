/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ProposalsService } from './proposals/services/proposals_service';
import type { IncidentsService } from './incidents/services/incidents_service';

export interface AgenticInvestigationsSetupDependencies {
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
  agentBuilder?: AgentBuilderPluginSetup;
}

export interface AgenticInvestigationsStartDependencies {
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  /**
   * agentBuilder is a required plugin (added to kibana.jsonc requiredPlugins).
   * IncidentsService uses it to obtain a per-request conversation client;
   * nothing is registered against agent_builder at setup time.
   */
  agentBuilder: AgentBuilderPluginStart;
}

/**
 * Exposed so a solution plugin can reach an entity in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one). One getter
 * per entity this plugin owns.
 */
export interface AgenticInvestigationsPluginStart {
  getProposalsService: () => ProposalsService;
  getIncidentsService: () => IncidentsService;
}

export type AgenticInvestigationsPluginSetup = Record<string, never>;
