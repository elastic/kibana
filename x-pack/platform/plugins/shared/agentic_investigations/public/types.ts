/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export type AgenticInvestigationsPublicPluginSetup = Record<string, never>;
export type AgenticInvestigationsPublicPluginStart = Record<string, never>;
