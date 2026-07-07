/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { CloudStart, CloudSetup } from '@kbn/cloud-plugin/server';
import type { UsageApiSetup, UsageApiStart } from '@kbn/usage-api-plugin/server';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from '@kbn/search-inference-endpoints/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { InferenceServerSetup, InferenceServerStart } from '@kbn/inference-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type {
  AgentContextLayerPluginSetup,
  AgentContextLayerPluginStart,
} from '@kbn/agent-context-layer-plugin/server';

export type {
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  TopSnippetsConfig,
  ToolsSetup,
  ToolsStart,
  AttachmentsSetup,
  SkillsSetup,
  SkillsStart,
  AgentsSetup,
  AgentsStart,
  ExecutionStart,
  PluginsSetup,
  PluginsStart,
  RuntimeStart,
  ReadOnlyConversationClient,
  ConversationsStart,
} from '@kbn/agent-builder-server';

export interface AgentBuilderSetupDependencies {
  cloud?: CloudSetup;
  usageApi?: UsageApiSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  workflowsManagement?: WorkflowsServerPluginSetup;
  inference: InferenceServerSetup;
  spaces?: SpacesPluginSetup;
  features: FeaturesPluginSetup;
  usageCollection?: UsageCollectionSetup;
  taskManager: TaskManagerSetupContract;
  actions: ActionsPluginSetup;
  home: HomeServerPluginSetup;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginSetup;
  agentContextLayer: AgentContextLayerPluginSetup;
}

export interface AgentBuilderStartDependencies {
  inference: InferenceServerStart;
  licensing: LicensingPluginStart;
  cloud?: CloudStart;
  usageApi?: UsageApiStart;
  spaces?: SpacesPluginStart;
  actions: ActionsPluginStart;
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  agentContextLayer: AgentContextLayerPluginStart;
}
