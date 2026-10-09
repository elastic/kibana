/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ImpactEntityTarget,
  RegisterFlyoutGroupedAttachment,
} from '@kbn/agentic-investigations-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { ProposalsPublicPluginStart } from '@kbn/proposals-plugin/public';

export interface AgenticInvestigationsPublicSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface AgenticInvestigationsPublicStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
  proposals?: ProposalsPublicPluginStart;
}

/** The part of `xpack.agenticInvestigations` exposed to the browser. */
export interface AgenticInvestigationsPublicConfig {
  /** Escalations are AlertZero-only for now; off on Observability serverless. */
  escalations: { enabled: boolean };
}

export interface AgenticInvestigationsPublicPluginSetup {
  registerFlyoutGroupedAttachment: RegisterFlyoutGroupedAttachment;
}

/** Opens the entity flyout for one impacted entity. Supplied by the solution that owns the flyout. */
export type ImpactEntityOpener = (entity: ImpactEntityTarget) => void;

export interface AgenticInvestigationsPublicPluginStart {
  /**
   * Registers the entity-flyout opener. Called from the solution's start, which runs after this
   * plugin's start, so the overview reads it when a row is clicked rather than at registration.
   */
  registerImpactEntityOpener: (opener: ImpactEntityOpener) => void;
}
