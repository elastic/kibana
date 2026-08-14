/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { MemoryStorage } from './storage/memory_storage';

// Plugin contracts — both are intentionally empty for Phase 1.
// Other plugins depend on the plugin IDs, not contracts.
export type AgentMemoryPluginSetup = object;
export type AgentMemoryPluginStart = object;

export interface AgentMemorySetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  security: SecurityPluginSetup;
  taskManager: TaskManagerSetupContract;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
}

export interface AgentMemoryStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  licensing: LicensingPluginStart;
  security: SecurityPluginStart;
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
}

/**
 * Builds a request-scoped storage adapter. Agent Memory is user data, so
 * callers must pass `asCurrentUser` — `kibana_system` has no
 * privileges on non-dot indices.
 */
export type GetMemoryStorage = (esClient: ElasticsearchClient) => MemoryStorage;

/** Dependencies threaded into route handlers. */
export interface AgentMemoryRouteHandlerDeps {
  router: IRouter;
  getMemoryStorage: GetMemoryStorage;
}
