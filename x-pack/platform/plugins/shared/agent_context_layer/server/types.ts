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
  SmlSearchConstraints,
  SmlDocument,
  SmlIndexAction,
  SmlDeleteScope,
  SmlIndexAttachmentOriginMode,
  SmlIndexAttachmentContentMode,
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
    /**
     * Optional subset of fields to return. Omit for all fields. Valid optional
     * values: `'content'`, `'description'`, `'tags'`, `'references'`.
     */
    fields?: string[];
    /** Runtime-imposed per-type id-allowlist constraints. */
    constraints?: SmlSearchConstraints;
    /** Agent-discoverable filters (`types[]`, `tags[]`). */
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[] }>;

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
  deleteAttachment: (params: SmlDeleteAttachmentParams) => Promise<void>;
}

/**
 * Common params shared by both modes of `AgentContextLayerPluginStart.indexAttachment`.
 *
 * The mode is selected by the discriminator fields from
 * {@link SmlIndexAttachmentOriginMode} / {@link SmlIndexAttachmentContentMode}, which are
 * shared with the internal `SmlIndexerParams` so the public and internal unions cannot
 * drift on the discriminator.
 */
interface SmlIndexAttachmentBaseParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaceId?: string;
  includedHiddenTypes?: string[];
}

export type SmlIndexAttachmentOriginParams = SmlIndexAttachmentBaseParams &
  SmlIndexAttachmentOriginMode;

export type SmlIndexAttachmentContentParams = SmlIndexAttachmentBaseParams &
  SmlIndexAttachmentContentMode;

/**
 * Discriminated union — `content` selects the mode:
 * - omitted → origin mode (calls `getSmlData`, marks `'crawled'`)
 * - provided → content mode (skips `getSmlData`, marks `'manual'`)
 *
 * `action: 'delete'` is valid on either variant; the indexer ignores
 * `content` and `force` when deleting and removes only `'crawled'` chunks.
 */
export type SmlIndexAttachmentParams =
  | SmlIndexAttachmentOriginParams
  | SmlIndexAttachmentContentParams;

/**
 * Params for `AgentContextLayerPluginStart.deleteAttachment`.
 *
 * Distinct from `indexAttachment({ action: 'delete' })` only in that callers
 * can choose to wipe `'manual'` or `'all'` chunks via `ingestionMethod`. With
 * the default (`'crawled'`) the two are equivalent.
 */
export interface SmlDeleteAttachmentParams {
  request: KibanaRequest;
  originId: string;
  attachmentType: string;
  /** Defaults to `'crawled'`. Pass `'all'` to fully retire the origin. */
  ingestionMethod?: SmlDeleteScope;
  spaceId?: string;
  includedHiddenTypes?: string[];
}
