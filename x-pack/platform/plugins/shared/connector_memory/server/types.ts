/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';

export interface ConnectorMemorySetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  /** Without it, memory cannot learn or crawl: both are workflows. */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface ConnectorMemoryStartDependencies {
  actions: ActionsPluginStart;
  contextEngine: ContextEnginePluginStart;
  inference?: InferenceServerStart;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

/** What the plugin's parts need from the platform, so they can be tested without it. */
export interface Services {
  getConnector: (
    request: KibanaRequest,
    connectorId: string
  ) => Promise<{ actionTypeId: string; authMode?: 'shared' | 'per-user' }>;
  listConnectors: (
    request: KibanaRequest
  ) => Promise<
    Array<{ id: string; name: string; actionTypeId: string; authMode?: 'shared' | 'per-user' }>
  >;
  getSpaceId: (request: KibanaRequest) => string;
  isContextEngineEnabled: (spaceId: string) => Promise<boolean>;
  /** The caller's user profile uid; undefined when the user has never logged in interactively. */
  getProfileUid: (request: KibanaRequest) => Promise<string | undefined>;
  esClient: (request: KibanaRequest) => ElasticsearchClient;
  runQuery: (params: {
    request: KibanaRequest;
    esql: string;
    params: Record<string, string>;
    limit: number;
  }) => Promise<{
    columns: ReadonlyArray<{ name: string }>;
    values: ReadonlyArray<ReadonlyArray<unknown>>;
  }>;
}
