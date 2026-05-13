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
   * Resolve "who can see chunks for this `originId`, and in which spaces?"
   *
   * This hook is the **sole** source of truth for chunk auth metadata when
   * chunks are written via direct mode (e.g. through the SML index-attachment
   * workflow step). The indexer:
   *
   *   1. Calls this hook with the caller's current `spaceId`.
   *   2. Rejects the write when the hook returns `undefined` (origin doesn't
   *      exist or isn't accessible from `spaceId` — this is also how
   *      cross-space writes are prevented).
   *   3. Tags every produced chunk with the returned `spaces` (overwriting
   *      whatever the caller passed) and `permissions` (overwriting any
   *      per-chunk values the caller may have supplied).
   *
   * Implementations should:
   *   - Be cheap (one saved-object `get` or equivalent).
   *   - Return `undefined` (rather than throwing) when the origin can't be
   *     resolved — the indexer interprets that as "deny this write".
   *   - Only return `spaces` that include `spaceId`, otherwise the indexer
   *     will reject the write as cross-space.
   *
   * Resolved mode (crawler) does **not** call this hook — it uses the chunks
   * and permissions returned by `getSmlData`, and the spaces returned by
   * `list`. The hook is therefore optional: types that are never written via
   * direct mode (e.g. crawler-only types) can omit it, in which case any
   * attempt to direct-write the type is rejected.
   */
  resolveOriginAccess?: (
    originId: string,
    context: SmlContext,
    spaceId: string
  ) => Promise<{ spaces: string[]; permissions: string[] } | undefined>;

  /**
   * Optional: custom crawl interval for the crawler.
   * Defaults to '10m' if not provided.
   */
  fetchFrequency?: () => string;
}

/**
 * Where a chunk was produced.
 *
 * - `resolved`: produced by the crawler or any caller relying on the registered
 *   type's `getSmlData(originId)` hook.
 * - `direct`: produced by a caller that supplied chunks directly (HTTP API,
 *   workflow step, ...).
 *
 * The two modes are mutually exclusive per `origin_id`: a `direct` write
 * overrides any existing chunks, and a `resolved` write is skipped when
 * `direct` chunks already exist.
 */
export type SmlDocumentSource = 'resolved' | 'direct';

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
  /** How this chunk was produced. See {@link SmlDocumentSource}. */
  source: SmlDocumentSource;
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
 * Per-type filter parameters for SML search.
 * Re-exported from the shared HTTP API types so server and client use a single definition.
 */
export type { SmlSearchFilters } from '../../../common/http_api/sml';

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
   */
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;

  /**
   * Index a single attachment (event-driven).
   *
   * Behavior depends on the effective `source`:
   * - `direct`: caller supplies `chunks` (and **must** supply `spaceId`).
   *   The indexer calls the type's `resolveOriginAccess(originId, ctx,
   *   spaceId)` hook to determine the effective `spaces` and `permissions`,
   *   wipes any pre-existing chunks for `originId` (regardless of source),
   *   and writes the supplied chunks tagged with `source: 'direct'`. For
   *   `action: 'delete'` it wipes all chunks for the origin after the same
   *   access check.
   * - `resolved`: the indexer calls `getSmlData(originId)` via the registered
   *   type. If chunks tagged `source: 'direct'` already exist for this origin,
   *   the operation is **skipped** to preserve the user's override.
   *
   * `source` is inferred when not provided: `'direct'` if `chunks` is set,
   * otherwise `'resolved'`.
   */
  indexAttachment: (params: {
    originId: string;
    attachmentType: string;
    action: SmlIndexAction;
    /**
     * Target spaces for **resolved** writes (typically supplied by the
     * crawler from `SmlListItem.spaces`). Ignored in direct mode — the
     * effective spaces are read from `resolveOriginAccess` instead.
     */
    spaces: string[];
    /**
     * Caller's current space. Required for **direct** writes — used to call
     * `resolveOriginAccess` and to reject cross-space attempts. Optional /
     * unused for resolved writes.
     */
    spaceId?: string;
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    chunks?: SmlChunk[];
    source?: SmlDocumentSource;
  }) => Promise<void>;

  /** Fetch SML documents by their chunk IDs, scoped to a space */
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, SmlDocument>>;

  /** Get a type definition by ID */
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;

  /** List all registered type definitions */
  listTypeDefinitions: () => SmlTypeDefinition[];
}
