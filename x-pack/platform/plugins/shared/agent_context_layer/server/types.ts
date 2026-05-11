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
  SmlTypeDefinition,
  SmlSearchResult,
  SmlSearchFilters,
  SmlDocument,
  SmlIndexAction,
  SmlChunk,
  SmlDocumentSource,
} from './services/sml/types';
import type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';

export interface AgentContextLayerSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
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
