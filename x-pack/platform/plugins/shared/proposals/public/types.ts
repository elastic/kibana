/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

export interface ProposalsPublicSetupDependencies {
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup;
}

export interface ProposalsPublicStartDependencies {
  agentBuilder?: AgentBuilderPluginStart;
}

export type ProposalsPublicPluginSetup = Record<string, never>;
export type ProposalsPublicPluginStart = Record<string, never>;
