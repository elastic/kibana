/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

export interface ElasticsearchHomeServerSetupDependencies {
  agentBuilder?: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}

export interface ElasticsearchHomeServerStartDependencies {
  taskManager: TaskManagerStartContract;
}
