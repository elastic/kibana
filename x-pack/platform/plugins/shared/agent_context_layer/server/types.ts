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
import type {
  SmlTypeDefinition,
  SmlSearchResult,
  SmlSearchFilters,
  SmlDocument,
  SmlIndexAction,
  SmlChunk,
} from './services/sml/types';
import type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';

export interface AgentContextLayerSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
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

  /**
   * Fetch SML documents by their chunk IDs.
   *
   * The returned map only contains documents the user (identified by `request`) is
   * authorized to access in the resolved space; unauthorized or missing IDs are
   * simply absent from the result. Permission checks are performed internally —
   * callers do not need to pre-authorize the IDs.
   */
  getDocuments: (params: {
    ids: string[];
    request: KibanaRequest;
    /** Optional. Resolved from `request` via the spaces service when omitted. */
    spaceId?: string;
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

/**
 * Common params shared by both modes of `AgentContextLayerPluginStart.indexAttachment`.
 */
interface SmlIndexAttachmentBaseParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaceId?: string;
  includedHiddenTypes?: string[];
}

/**
 * Origin mode — content is produced by the registered type's `getSmlData` hook.
 * Resulting chunks are tagged `ingestion_method: 'crawled'`.
 *
 * If the target `origin_id` already has any `ingestion_method: 'manual'` chunks,
 * the call is a no-op unless `force: true` is provided.
 */
export interface SmlIndexAttachmentOriginParams extends SmlIndexAttachmentBaseParams {
  /** Override existing manual entries. Default: false. */
  force?: boolean;
  content?: undefined;
}

/**
 * Content mode — caller supplies pre-built chunks directly; `getSmlData` is not called.
 * Resulting chunks are tagged `ingestion_method: 'manual'`. Always overwrites existing
 * chunks for the `origin_id`.
 */
export interface SmlIndexAttachmentContentParams extends SmlIndexAttachmentBaseParams {
  content: SmlChunk[];
  force?: undefined;
}

/**
 * Discriminated union — `content` selects the mode:
 * - omitted → origin mode (calls `getSmlData`, marks `'crawled'`)
 * - provided → content mode (skips `getSmlData`, marks `'manual'`)
 */
export type SmlIndexAttachmentParams =
  | SmlIndexAttachmentOriginParams
  | SmlIndexAttachmentContentParams;
