/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';

/**
 * A single SML chunk to be indexed.
 */
export interface SmlChunk {
  /** Type of the chunk (e.g., 'dashboard', 'lens', 'esql') */
  type: string;
  /** Searchable content text */
  content: string;
  /** Display title */
  title: string;
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
 * Context passed to SML type hooks.
 * `spaceId` is set for getSmlData (event-driven indexing) and toAttachment,
 * but is absent when calling `list` (which fetches across all spaces).
 */
export interface SmlContext {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId?: string;
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
 * A converted conversation attachment from SML.
 */
export interface SmlConversationAttachment {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Server-side type definition for SML (Semantic Metadata Layer).
 *
 * Registered via `agentBuilder.sml.registerType()` during plugin setup.
 *
 * Solutions register these to make their content discoverable via the SML.
 */
export interface SmlTypeDefinition {
  /** Unique identifier for this SML type (e.g., 'dashboard', 'lens', 'esql') */
  id: string;

  /**
   * Return all items to consider for indexing.
   * Called by the crawler to enumerate candidates.
   */
  list: (context: SmlContext) => Promise<SmlListItem[]>;

  /**
   * Return normalized data to index for a specific attachment.
   */
  getSmlData: (attachmentId: string, context: SmlContext) => Promise<SmlData | undefined>;

  /**
   * Convert an SML document into a conversation attachment.
   */
  toAttachment: (
    item: SmlDocument,
    context: SmlToAttachmentContext
  ) => Promise<SmlConversationAttachment | undefined>;

  /**
   * Optional: custom fetch frequency for the crawler.
   * Defaults to '10m' if not provided.
   */
  fetchFrequency?: () => string;
}

/**
 * An SML document as stored in the system index.
 */
export interface SmlDocument {
  /** Unique id of the chunk */
  id: string;
  /** Type of the attachment */
  type: string;
  /** Display title */
  title: string;
  /** Unique id of the source asset */
  attachment_reference_id: string;
  /** Searchable content */
  content: string;
  /** Timestamp when first created */
  created_at: string;
  /** Timestamp when last updated */
  updated_at: string;
  /** Space IDs this item belongs to */
  spaces: string[];
  /** Permissions required to access the underlying element */
  permissions: string[];
}

/**
 * An SML search result — an SML document enriched with a search score.
 */
export type SmlSearchResult = SmlDocument & {
  /** Search relevance score */
  score: number;
};

/**
 * Crawler state document stored in the crawler state index.
 */
export interface SmlCrawlerStateDocument {
  attachment_id: string;
  attachment_type: string;
  /** Space IDs this item belongs to (from the source saved object) */
  spaces: string[];
  created_at: string;
  updated_at: string;
  /** Pending action set by the crawler. null when the action has been processed. */
  update_action: 'create' | 'update' | 'delete' | null;
}

/**
 * Action to index an SML attachment.
 */
export type SmlIndexAction = 'create' | 'update' | 'delete';

/**
 * Parameters for the event-driven indexing API.
 */
export interface SmlIndexAttachmentParams {
  request: KibanaRequest;
  attachmentId: string;
  attachmentType: string;
  action: SmlIndexAction;
  spaceId?: string;
}

/**
 * SML service interface — exposed on the plugin start contract.
 */
export interface SmlService {
  /** Search the SML index, filtering results by space and permissions */
  search: (params: {
    keywords: string[];
    size?: number;
    spaceId: string;
    esClient: ElasticsearchClient;
    request: KibanaRequest;
  }) => Promise<{ results: SmlSearchResult[]; total: number }>;

  /**
   * Check whether the current user has access to specific SML items.
   * Returns a map of document id → authorized (true/false).
   */
  checkItemsAccess: (params: {
    items: Array<{ id: string; type: string }>;
    spaceId: string;
    esClient: ElasticsearchClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;

  /** Index a single attachment (event-driven) */
  indexAttachment: (params: {
    attachmentId: string;
    attachmentType: string;
    action: SmlIndexAction;
    spaces: string[];
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
  }) => Promise<void>;

  /** Fetch SML documents by their chunk IDs, scoped to a space */
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: ElasticsearchClient;
  }) => Promise<Map<string, SmlDocument>>;

  /** Get a type definition by ID */
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;

  /** List all registered type definitions */
  listTypeDefinitions: () => SmlTypeDefinition[];
}
