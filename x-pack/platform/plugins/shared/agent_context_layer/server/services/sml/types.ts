/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { SmlSearchFilters } from '../../../common/http_api/sml';

/**
 * A single SML chunk to be indexed.
 */
export interface SmlChunk {
  /** Type of the chunk (e.g., 'dashboard', 'lens', 'esql') */
  type: string;
  /** Searchable content (indexed as `semantic_text`) */
  content: string;
  /** Display title */
  title: string;
  /** Longer summary for semantic search (indexed as `semantic_text`); omit or empty if none */
  description?: string;
  /** Owner or last-modifier user id when known */
  user_id?: string;
  /** Other SML chunk ids this item references */
  references?: string[];
  /** Permissions required to access the underlying element (e.g., 'saved_object:lens/get') */
  permissions?: string[];
}

/**
 * Return value from getSmlData — normalized data to index.
 */
export interface SmlData {
  chunks: SmlChunk[];
}

/**
 * Context passed to SML type hooks (`list` and `getSmlData`).
 */
export interface SmlContext {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Context passed to the toAttachment hook.
 */
export interface SmlToAttachmentContext {
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
}

/**
 * An item returned by the `list` hook of an SML type.
 */
export interface SmlListItem {
  /** Unique ID of the attachment (e.g., saved object ID) */
  id: string;
  /** Last updated timestamp — used by crawler for change detection */
  updatedAt: string;
  /** Space IDs this item belongs to */
  spaces: string[];
}

/**
 * Server-side type definition for SML (Semantic Metadata Layer).
 *
 * Registered via `agentContextLayer.registerType()` during plugin setup.
 *
 * Solutions register these to make their content discoverable via the SML.
 */
export interface SmlTypeDefinition {
  /** Unique identifier for this SML type (e.g., 'dashboard', 'lens', 'esql') */
  id: string;

  /**
   * Yield pages of items to consider for indexing.
   * Called by the crawler to enumerate candidates.
   * Each yielded array is one page; the crawler processes pages
   * with O(page_size) memory instead of loading everything at once.
   */
  list: (context: SmlContext) => AsyncIterable<SmlListItem[]>;

  /**
   * Return normalized data to index for a specific item.
   */
  getSmlData: (originId: string, context: SmlContext) => Promise<SmlData | undefined>;

  /**
   * Convert an SML document into a conversation attachment.
   */
  toAttachment: (
    item: SmlDocument,
    context: SmlToAttachmentContext
  ) => Promise<AttachmentInput<string, unknown> | undefined>;

  /**
   * Optional: custom crawl interval for the crawler.
   * Defaults to '10m' if not provided.
   */
  fetchFrequency?: () => string;
}

/**
 * How a chunk was produced.
 *
 * - `'crawled'`: written by the SML crawler or by an event-driven `indexAttachment`
 *   origin-mode call (content fetched via `getSmlData`).
 * - `'manual'`: written explicitly by a user/admin — via the HTTP upsert route or via
 *   `indexAttachment` content-mode. Manual entries are protected from being overwritten
 *   by the crawler / origin-mode `indexAttachment` unless `force: true` is passed.
 */
export type SmlIngestionMethod = 'manual' | 'crawled';

/**
 * An SML document as stored in the system index.
 */
export interface SmlDocument {
  /** Unique id of the chunk */
  id: string;
  /** SML type (e.g., 'visualization', 'dashboard') */
  type: string;
  /** Display title */
  title: string;
  /** Origin ID (e.g., saved object ID) */
  origin_id: string;
  /** Searchable content (`semantic_text` in the index) */
  content: string;
  /** Semantic summary (`semantic_text` in the index) */
  description?: string;
  /** Owner or last-modifier user id */
  user_id?: string;
  /** Referenced SML chunk ids */
  references?: string[];
  /** Timestamp when first created */
  created_at: string;
  /** Timestamp when last updated */
  updated_at: string;
  /** Space IDs this item belongs to */
  spaces: string[];
  /** Permissions required to access the underlying element */
  permissions: string[];
  /** How this chunk was produced. */
  ingestion_method: SmlIngestionMethod;
}

/**
 * An SML search result — same fields as {@link SmlDocument} plus relevance score.
 * `content` and `description` are optional when excluded from `_source` (e.g. `skipContent`).
 */
export type SmlSearchResult = Omit<SmlDocument, 'content'> & {
  content?: string;
  score: number;
};

/**
 * Crawler state document stored in the crawler state index.
 */
export interface SmlCrawlerStateDocument {
  /** Origin ID (e.g., saved object ID) */
  origin_id: string;
  /** SML type definition ID (e.g., 'visualization') */
  type_id: string;
  /** Space IDs this item belongs to (from the source saved object) */
  spaces: string[];
  created_at: string;
  updated_at: string;
  /** Pending action set by the crawler. undefined (field omitted) when the action has been processed. */
  update_action: 'create' | 'update' | 'delete' | undefined;
  /** Timestamp of the last crawl run that saw this item. Used for mark-and-sweep deletion. */
  last_crawled_at: string;
}

/**
 * Action to index an SML attachment.
 */
export type SmlIndexAction = 'create' | 'update' | 'delete';

/**
 * The SML crawler enumerates registered SML types, compares the current state
 * with what has been previously indexed, and queues create/update/delete actions
 * to be processed by the indexer.
 */
export interface SmlCrawler {
  crawl: (params: {
    definition: SmlTypeDefinition;
    esClient: ElasticsearchClient;
    savedObjectsClient: ISavedObjectsRepository;
    abortSignal?: AbortSignal;
  }) => Promise<void>;
}

/**
 * Input fields for upserting an SML document.
 *
 * `created_at` / `updated_at` are managed server-side; `id` is the URL path id;
 * `spaces` is derived from the caller's space (on create) or preserved from the
 * existing document (on update) — callers cannot specify it directly.
 */
export interface SmlDocumentInput {
  type: string;
  title: string;
  origin_id: string;
  content: string;
  permissions?: string[];
}

/**
 * Result of an upsert operation.
 */
export interface SmlUpsertResult {
  document: SmlDocument;
  /** Whether the document was newly created (vs. updated in place). */
  created: boolean;
}

/**
 * Per-type filter parameters for SML search.
 * Re-exported from the shared HTTP API types so server and client use a single definition.
 */
export type { SmlSearchFilters } from '../../../common/http_api/sml';

/**
 * Mode discriminator for `indexAttachment`.
 *
 * The two mixins below define the discriminated half of the parameter object. They are
 * combined with a layer-specific "base" (public vs internal) to form the full unions:
 * `SmlIndexAttachmentParams` (public, in `server/types.ts`) and `SmlIndexerParams`
 * (internal, below).
 *
 * Origin mode — content is produced by the registered type's `getSmlData` hook.
 * Resulting chunks are tagged `ingestion_method: 'crawled'`. If the target `origin_id`
 * already has any `ingestion_method: 'manual'` chunks, the call is a no-op unless
 * `force: true` is provided.
 */
export interface SmlIndexAttachmentOriginMode {
  /** Override existing manual entries. Default: false. */
  force?: boolean;
  content?: undefined;
}

/**
 * Content mode — caller supplies pre-built chunks directly; `getSmlData` is not called.
 * Resulting chunks are tagged `ingestion_method: 'manual'`. Always overwrites existing
 * chunks for the `origin_id`.
 */
export interface SmlIndexAttachmentContentMode {
  /** Pre-built chunks; skips getSmlData; marks `ingestion_method='manual'`. */
  content: SmlChunk[];
  force?: undefined;
}

/**
 * Common params shared by both modes of the internal `indexAttachment` flow
 * (`SmlService.indexAttachment` and `SmlIndexer.indexAttachment`).
 *
 * Unlike the public-contract `SmlIndexAttachmentParams` (`server/types.ts`), this
 * type has no `request` / `spaceId` — by the time the call reaches the service or
 * indexer, the public wrapper has already resolved a scoped saved-objects client,
 * an internal ES client, and the space list.
 */
interface SmlIndexerBaseParams {
  originId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaces: string[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
  logger: Logger;
}

export type SmlIndexerOriginParams = SmlIndexerBaseParams & SmlIndexAttachmentOriginMode;
export type SmlIndexerContentParams = SmlIndexerBaseParams & SmlIndexAttachmentContentMode;

/**
 * Discriminated union for the internal `indexAttachment` flow. Shared between
 * `SmlService.indexAttachment` and `SmlIndexer.indexAttachment`.
 */
export type SmlIndexerParams = SmlIndexerOriginParams | SmlIndexerContentParams;

/**
 * SML service interface — exposed on the plugin start contract.
 */
export interface SmlService {
  /** Get the crawler instance (for task manager integration) */
  getCrawler: () => SmlCrawler;
  /** Search the SML index, filtering results by space and permissions */
  search: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    /** When true, Elasticsearch omits `content` from `_source` (smaller payloads for autocomplete). */
    skipContent?: boolean;
    /** Per-type filters. See {@link SmlSearchFilters}. */
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[]; total: number }>;

  /**
   * Check whether the current user has access to specific SML items.
   * Returns a map of document id → authorized (true/false).
   *
   * **Internal use only.** Callers outside the plugin should use the public
   * `getDocuments` method, which performs this check internally and returns
   * only authorized documents. This primitive is exposed on the internal
   * `SmlService` so `resolveSmlAttachItems` can distinguish "access denied"
   * from "not found" in its per-item error messages.
   */
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;

  /** Index a single attachment (event-driven or manual). See {@link SmlIndexerParams}. */
  indexAttachment: (params: SmlIndexerParams) => Promise<void>;

  /**
   * Fetch SML documents by their chunk IDs, scoped to a space.
   *
   * **Internal use only — does NOT perform permission checks.** The public
   * `AgentContextLayerPluginStart.getDocuments` wraps this with an access
   * check and filters out unauthorized IDs before fetching. Direct callers
   * MUST authorize IDs (via `checkItemsAccess`) before invoking this method,
   * or use it only from system contexts where the user's privileges are
   * irrelevant (e.g. crawler/indexer tasks).
   */
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;

  /** List SML documents in a space with optional filters and pagination. */
  listDocuments: (params: {
    spaceId: string;
    esClient: IScopedClusterClient;
    page?: number;
    perPage?: number;
    type?: string;
    originId?: string;
  }) => Promise<{ total: number; results: SmlDocument[] }>;

  /**
   * Upsert an SML document by id, scoped to a space.
   *
   * On create the new document's `spaces` is `[spaceId]`. On update the
   * existing document's `spaces` is preserved.
   *
   * Resolves to `null` when a document with this id exists but is not
   * visible from `spaceId` (caller cannot clobber across spaces).
   */
  upsertDocument: (params: {
    id: string;
    spaceId: string;
    document: SmlDocumentInput;
    esClient: IScopedClusterClient;
  }) => Promise<SmlUpsertResult | null>;

  /**
   * Delete an SML document by id, scoped to a space.
   * Resolves to `true` when a document was deleted, `false` when no
   * matching document was found.
   */
  deleteDocument: (params: {
    id: string;
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<boolean>;

  /** Get a type definition by ID */
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;

  /** List all registered type definitions */
  listTypeDefinitions: () => SmlTypeDefinition[];
}
