/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ProposalsService } from './proposals/services/proposals_service';
import type { NsiInvestigationsClientLike } from './investigations/nsi_client';

/**
 * Minimal structural interface for the nightshiftInvestigations start contract.
 * Defined locally to avoid a circular module dependency: the NSI plugin already
 * imports from @kbn/agentic-investigations-plugin/server, so importing from
 * @kbn/nightshift-investigations-plugin/server here would create a cycle.
 */
interface NightshiftInvestigationsStart {
  getInvestigationsClient(request: KibanaRequest, spaceId?: string): NsiInvestigationsClientLike;
}

export interface AgenticInvestigationsSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}

export interface AgenticInvestigationsStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  nightshiftInvestigations?: NightshiftInvestigationsStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

/**
 * Opaque handle for the shared investigations service. Callers narrow it to
 * their concrete interface via `as unknown as ConcreteServiceType` — the double
 * cast is intentional: the full InvestigationsService class is not exported on
 * the public contract to avoid exposing implementation details.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface InvestigationsServiceHandle {}

/**
 * Exposed so a solution plugin can reach an entity in-process rather than over
 * HTTP (Core's self client refuses a self call that is already one). One getter
 * per entity this plugin owns.
 */
export interface AgenticInvestigationsPluginStart {
  getProposalsService: () => ProposalsService;
  /**
   * Returns the shared InvestigationsService handle. Callers cast this to their
   * concrete service interface — the handle is opaque to avoid circular imports.
   */
  getInvestigationsService: () => InvestigationsServiceHandle;
}

export type AgenticInvestigationsPluginSetup = Record<string, never>;
