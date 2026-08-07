/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SearchInferenceEndpointsPluginSetup } from '@kbn/search-inference-endpoints/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { MemoryService } from './lib/memory';

export interface AgentMemorySetupDependencies {
  agentBuilder: AgentBuilderPluginSetup;
  features: FeaturesPluginSetup;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginSetup;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
  /**
   * The workflows management API lives on the *setup* contract — the start
   * contract is empty — so it is captured at setup and reused later.
   */
  workflowsManagement?: WorkflowsServerPluginSetup;
}

export interface AgentMemoryStartDependencies {
  agentBuilder: AgentBuilderPluginStart;
  licensing?: LicensingPluginStart;
  spaces?: SpacesPluginStart;
  workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
}

/**
 * Whether some host feature is currently blocking background memory activity —
 * for example Significant Events being paused for maintenance.
 */
export interface BackgroundActivityGateResult {
  blocked: boolean;
  reason?: string;
}

export type BackgroundActivityGate = () => Promise<BackgroundActivityGateResult>;

export interface AgentMemoryPluginSetup {
  /**
   * Whether memory is enabled in this deployment. Cheap and request-free: reads
   * an in-memory value, so it is safe to call from a tool availability handler.
   */
  isMemoryEnabled: () => boolean;
  /**
   * Lets a host feature block manual curation-workflow runs and re-enablement
   * while it is paused. Without a registered gate, nothing is ever blocked.
   */
  registerBackgroundActivityGate: (gate: BackgroundActivityGate) => void;
}

export interface AgentMemoryPluginStart {
  isMemoryEnabled: () => boolean;
  /** Whether the memory data streams have been created in this deployment. */
  isStorageInstalled: () => boolean;
  /**
   * Builds a memory service over the given client. Memory is space-agnostic, so
   * the caller decides the credentials — pass a user-scoped client for anything
   * acting on a user's behalf.
   */
  getMemoryService: (esClient: ElasticsearchClient) => MemoryService;
}
