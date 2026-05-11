/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type {
  CreateWorkflowCommand,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
  WorkflowExecutionListDto,
  WorkflowListDto,
  WorkflowsSearchParams,
} from '@kbn/workflows';
import type {
  SmlTypeDefinition,
  SmlSearchResult,
  SmlSearchFilters,
  SmlDocument,
  SmlIndexAction,
  SmlChunk,
  SmlDocumentSource,
} from './services/sml/types';
import type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';

/**
 * Minimal projection of `WorkflowsManagementApi` used by the Agent Context
 * Layer. We define it locally instead of importing
 * `@kbn/workflows-management-plugin/server` so we avoid a TypeScript project
 * reference cycle (workflows_management already depends on
 * `@kbn/agent-context-layer-plugin/server` for its SML notify types).
 *
 * Stays structurally compatible with the real `WorkflowsManagementApi`
 * surface — at runtime the value is the same `management` object the
 * workflows_management plugin returns from its setup contract.
 */
export interface WorkflowsManagementApiContract {
  isWorkflowsAvailable: boolean;
  getWorkflows(
    params: WorkflowsSearchParams,
    spaceId: string,
    options?: { includeExecutionHistory?: boolean }
  ): Promise<WorkflowListDto>;
  getWorkflow(
    id: string,
    spaceId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkflowDetailDto | null>;
  createWorkflow(
    workflow: CreateWorkflowCommand,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto>;
  /**
   * Partial update for an existing workflow document. Used by the SML
   * installer to refresh built-in workflow YAML when the template ships an
   * updated version.
   */
  updateWorkflow(
    id: string,
    workflow: Partial<{ name: string; description: string; yaml: string; enabled: boolean }>,
    spaceId: string,
    request: KibanaRequest
  ): Promise<{ id: string }>;
  /**
   * Delete workflows by id. Defaults to soft-delete (sets `deleted_at`); pass
   * `{ force: true }` to permanently purge the document so its `_id` becomes
   * available for reuse.
   */
  deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest,
    options?: { force?: boolean }
  ): Promise<{
    total: number;
    deleted: number;
    failures: Array<{ id: string; error: string }>;
  }>;
  runWorkflow(
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest,
    triggeredBy?: string
  ): Promise<string>;
  cancelWorkflowExecution(executionId: string, spaceId: string): Promise<void>;
  resumeWorkflowExecution(
    executionId: string,
    spaceId: string,
    input: Record<string, unknown>,
    request: KibanaRequest
  ): Promise<void>;
  getWorkflowExecutions(
    params: { workflowId: string; size?: number; page?: number },
    spaceId: string
  ): Promise<WorkflowExecutionListDto>;
  /**
   * Fetch a single execution detail (including `stepExecutions`) so the SML
   * admin page can show per-step progress for running workflows (current
   * index for `workflow-sml-index-augmentation`, completion counter for
   * `workflow-sml-index-crawl`).
   *
   * Pass `{ includeInput: true, includeOutput: true }` when progress needs
   * the rendered step `input` (e.g. `inputs.indexPattern`) or `output` (e.g.
   * the `list_indices` array) — those fields are stripped by default to
   * keep the response small for the workflow list view.
   */
  getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null>;
}

export interface WorkflowsManagementSetupContract {
  management: WorkflowsManagementApiContract;
}

export interface AgentContextLayerSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  workflowsManagement: WorkflowsManagementSetupContract;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}

export interface AgentContextLayerStartDependencies {
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
}

export interface AgentContextLayerPluginSetup {
  registerType: (definition: SmlTypeDefinition) => void;
}

export interface AgentContextLayerPluginStart {
  search: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    skipContent?: boolean;
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[]; total: number }>;

  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;

  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;

  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;

  resolveSmlAttachItems: (params: {
    chunkIds: string[];
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    spaceId: string;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) => Promise<SmlResolvedItemResult[]>;

  indexAttachment: (params: SmlIndexAttachmentParams) => Promise<void>;
}

export interface SmlIndexAttachmentParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaceId?: string;
  includedHiddenTypes?: string[];
  /**
   * Optional pre-computed chunks. When provided (for `create`/`update`), the
   * SML service skips the registered type's `getSmlData` hook and indexes the
   * supplied chunks directly. Ignored for `action: 'delete'`.
   */
  chunks?: SmlChunk[];
  /**
   * Explicit source for this operation. When not provided, defaults to
   * `'direct'` if `chunks` is set, otherwise `'resolved'`.
   *
   * `direct` writes override any existing chunks for the `originId`.
   * `resolved` writes are skipped when `direct` chunks already exist for the
   * `originId` (preserving the user's override).
   */
  source?: SmlDocumentSource;
}
