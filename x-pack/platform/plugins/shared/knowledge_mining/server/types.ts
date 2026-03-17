/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
} from '@kbn/agent-builder-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';

export interface KnowledgeMiningSetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  inference: InferenceServerSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface KnowledgeMiningStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  inference: InferenceServerStart;
  spaces?: SpacesPluginStart;
}

export type KnowledgeMiningPluginSetup = Record<string, never>;

export type KnowledgeMiningPluginStart = Record<string, never>;
