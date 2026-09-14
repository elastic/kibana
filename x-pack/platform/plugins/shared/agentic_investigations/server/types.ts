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
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ProposalsService } from './proposals/services/proposals_service';
import type { InvestigationsService } from './investigations/services/investigations_service';

export interface AgenticInvestigationsSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface AgenticInvestigationsStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

/**
 * Exposed so a solution plugin can reach an entity in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one). One getter
 * per entity this plugin owns.
 */
export interface AgenticInvestigationsPluginStart {
  getProposalsService: () => ProposalsService;
  getInvestigationsService: () => InvestigationsService;
}

export type AgenticInvestigationsPluginSetup = Record<string, never>;
