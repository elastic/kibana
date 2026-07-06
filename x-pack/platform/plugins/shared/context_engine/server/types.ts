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
  ContextEngineTypeDefinition,
  ContextEngineSearchResult,
  ContextEngineSearchFilters,
  ContextEngineSearchConstraints,
  ContextEngineDocument,
  ContextEngineIndexAction,
  ContextEngineDeleteScope,
  ContextEngineIndexAttachmentOriginMode,
  ContextEngineIndexAttachmentContentMode,
} from './services/context_engine/types';
import type { ContextEngineResolvedItemResult } from './services/context_engine/execute_attach_items';

export interface ContextEngineSetupDependencies {
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
  workflowsExtensions?: WorkflowsExtensionsServerPluginSetup;
}

export interface ContextEngineStartDependencies {
  taskManager: TaskManagerStartContract;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
}

export interface ContextEnginePluginSetup {
  registerType: (definition: ContextEngineTypeDefinition) => void;
}

export interface ContextEnginePluginStart {
  search: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    /**
     * Optional subset of fields to return. Omit for all fields. Valid optional
     * values: `'content'`, `'description'`, `'tags'`, `'references'`.
     */
    fields?: string[];
    /** Runtime-imposed per-type id-allowlist constraints. */
    constraints?: ContextEngineSearchConstraints;
    /** Agent-discoverable filters (`types[]`, `tags[]`). */
    filters?: ContextEngineSearchFilters;
  }) => Promise<{ results: ContextEngineSearchResult[] }>;

  /**
   * Fetch Context Engine documents by their entry IDs.
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
  }) => Promise<Map<string, ContextEngineDocument>>;

  getTypeDefinition: (typeId: string) => ContextEngineTypeDefinition | undefined;

  resolveAttachItems: (params: {
    entryIds: string[];
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    spaceId: string;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) => Promise<ContextEngineResolvedItemResult[]>;

  indexAttachment: (params: ContextEngineIndexAttachmentParams) => Promise<void>;
  deleteAttachment: (params: ContextEngineDeleteAttachmentParams) => Promise<void>;
}

/**
 * Common params shared by both modes of `ContextEnginePluginStart.indexAttachment`.
 *
 * The mode is selected by the discriminator fields from
 * {@link ContextEngineIndexAttachmentOriginMode} / {@link ContextEngineIndexAttachmentContentMode}, which are
 * shared with the internal `ContextEngineIndexerParams` so the public and internal unions cannot
 * drift on the discriminator.
 */
interface ContextEngineIndexAttachmentBaseParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  action: ContextEngineIndexAction;
  spaceId?: string;
  includedHiddenTypes?: string[];
}

export type ContextEngineIndexAttachmentOriginParams = ContextEngineIndexAttachmentBaseParams &
  ContextEngineIndexAttachmentOriginMode;

export type ContextEngineIndexAttachmentContentParams = ContextEngineIndexAttachmentBaseParams &
  ContextEngineIndexAttachmentContentMode;

/**
 * Discriminated union — `content` selects the mode:
 * - omitted → origin mode (calls `getContextEngineData`, marks `'crawled'`)
 * - provided → content mode (skips `getContextEngineData`, marks `'manual'`)
 *
 * `action: 'delete'` is valid on either variant; the indexer ignores
 * `content` and `force` when deleting and removes only `'crawled'` entries.
 */
export type ContextEngineIndexAttachmentParams =
  | ContextEngineIndexAttachmentOriginParams
  | ContextEngineIndexAttachmentContentParams;

/**
 * Params for `ContextEnginePluginStart.deleteAttachment`.
 *
 * Distinct from `indexAttachment({ action: 'delete' })` only in that callers
 * can choose to wipe `'manual'` or `'all'` entries via `ingestionMethod`. With
 * the default (`'crawled'`) the two are equivalent.
 */
export interface ContextEngineDeleteAttachmentParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  /** Defaults to `'crawled'`. Pass `'all'` to fully retire the origin. */
  ingestionMethod?: ContextEngineDeleteScope;
  spaceId?: string;
  includedHiddenTypes?: string[];
}
