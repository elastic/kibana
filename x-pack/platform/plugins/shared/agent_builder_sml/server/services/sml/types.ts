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
import type { SmlSearchFilters, SmlSearchConstraints } from '../../../common/http_api/sml';

/**
 * One entry in {@link SmlEntry.discovery_labels}. `value` is what the autocomplete
 * matches against; `kind` describes how the UI should render the matched label.
 *
 * `kind` is open (free-form keyword at the ES level). The indexer auto-prepends
 * entries with `kind: 'title'` and `kind: 'type'` derived from the entry's title
 * and type fields. Producers can add additional entries with any kind (e.g.
 * 'tagline', 'nickname', 'category', 'synonym') — the UI decides how to render
 * each kind.
 */
interface DiscoveryLabel {
  value: string;
  kind: string;
}

/**
 * A single Kibana feature privilege required to access an entry
 * (e.g., `saved_object:lens/get`, `action:execute`).
 */
interface SmlKibanaPrivilege {
  name: string;
}

/**
 * Permissions required to access an entry.
 *
 * The `kibana` sub-object is always present (with a possibly-empty array)
 * on stored documents to keep the schema rigid and predictable.
 */
export interface SmlPermissions {
  kibana: { privileges: SmlKibanaPrivilege[] };
}

/**
 * Normalized data to index for one SML origin. Every currently-registered
 * SML type produces exactly one entry per originId — this is a flat shape,
 * not a chunk array, because no real multi-entry-per-origin use case exists.
 */
export interface SmlEntry {
  /** Type of the entry (e.g., 'dashboard', 'lens', 'esql') */
  type: string;
  /** Searchable content (indexed as `semantic_text`) */
  content: string;
  /** Display title */
  title: string;
  /** Longer summary for semantic search (indexed as `semantic_text`); omit or empty if none */
  description?: string;
  /** Free-form labels for filtering and discovery */
  tags?: string[];
  /**
   * Categorical / nickname terms that make this record discoverable beyond `type`
   * and `title`. Each label carries a `kind` so the UI can render it appropriately.
   */
  discovery_labels?: DiscoveryLabel[];
  /**
   * Type-specific structured data. Stored as `flattened` so leaves are
   * keyword-searchable for sub-path filtering. SML treats this opaquely;
   * type writers own its shape.
   */
  extended_attrs?: Record<string, unknown>;
  /** Owner or last-modifier user id when known */
  user_id?: string;
  /** Other SML entries this item references. Each entry carries a `uri` field. */
  references?: Array<{ uri: string }>;
}

/**
 * Context passed to SML type hooks (`list` and `getSmlEntry`).
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
 * Registered via `agentBuilderSml.registerType()` during plugin setup.
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
  getSmlEntry: (originId: string, context: SmlContext) => Promise<SmlEntry | undefined>;

  /**
   * Convert an SML document into a conversation attachment.
   */
  toAttachment: (
    item: SmlDocument,
    context: SmlToAttachmentContext
  ) => Promise<AttachmentInput<string, unknown> | undefined>;

  /**
   * Compute the {@link SmlPermissions} that gate access to the entry for the
   * given `originId`. Called by the indexer for every entry it stamps.
   *
   * Authoritative when defined. `SmlEntry` does not carry a `permissions`
   * field. Types that need permission shapes the built-in helpers do not
   * cover should still implement this directly (returning a fully-shaped
   * {@link SmlPermissions}).
   *
   * Omit when the type wraps a resource that is intentionally public within
   * the space (e.g. taxonomy entries, public schema docs). The indexer then
   * stamps an empty `SmlPermissions`, which the read-path security filter
   * treats as "no privileges required". A type that wraps a sensitive
   * resource MUST implement this hook — there is no other way to attach an
   * access-control gate to its entry.
   *
   * For Kibana saved-object-backed types, prefer the
   * `kibanaSavedObjectPermissions` helper over hand-writing the privilege
   * string.
   */
  getPermissions?: (
    originId: string,
    context: SmlContext
  ) => Promise<SmlPermissions> | SmlPermissions;

  /**
   * Optional: custom crawl interval for the crawler.
   * Defaults to '10m' if not provided.
   */
  fetchFrequency?: () => string;
}

/**
 * How an entry was produced.
 *
 * - `'crawled'`: written by the SML crawler or by an event-driven `indexAttachment`
 *   origin-mode call (content fetched via `getSmlEntry`).
 * - `'manual'`: written explicitly by a user/admin via the HTTP upsert route.
 *   Manual entries are protected from being overwritten by the crawler /
 *   origin-mode `indexAttachment` unless `force: true` is passed.
 */
export type SmlIngestionMethod = 'manual' | 'crawled';

/**
 * An SML document as stored in the system index.
 */
export interface SmlDocument {
  /** Unique id of the entry */
  id: string;
  /** SML type (e.g., 'visualization', 'dashboard') */
  type: string;
  /** Display title */
  title: string;
  /** Raw origin id (e.g. saved object ID). Not stored in the index — derived at read time from `origin.uri`. */
  origin_id?: string;
  /** Self-describing URI for the origin, e.g. `${type}://${origin_id}`. */
  origin: { uri: string };
  /** Searchable content (`semantic_text` in the index) */
  content: string;
  /** Semantic summary (`semantic_text` in the index) */
  description?: string;
  /** Free-form labels */
  tags?: string[];
  /**
   * Categorical / nickname terms beyond `type` and `title`.
   * Nested entries `{ value, kind }`; `value.autocomplete` is the SAYT subfield
   * that powers the @ menu, and `kind` drives UI badge rendering.
   */
  discovery_labels?: DiscoveryLabel[];
  /** Type-specific structured data (`flattened` mapping) */
  extended_attrs?: Record<string, unknown>;
  /** Owner or last-modifier user id */
  user_id?: string;
  /** Other SML entries this item references. Each entry carries a `uri` field; the object shape allows sub-fields (e.g. relationship kind) without a future migration. */
  references?: Array<{ uri: string }>;
  /** Timestamp when first created */
  created_at: string;
  /** Timestamp when last updated */
  updated_at: string;
  /** Space IDs this item belongs to */
  spaces: string[];
  /**
   * Permissions required to access the underlying element. Always present
   * on stored documents; the inner privileges array may be empty.
   */
  permissions: SmlPermissions;
  /** How this entry was produced. */
  ingestion_method: SmlIngestionMethod;
}

/**
 * Compact SML search result — LLM-shaped. Drops the full `content` blob, the
 * full `extended_attrs`, and bookkeeping fields. Callers fetch full content via the
 * lookup tool (`sml_read`) when they need it.
 *
 * `permissions` is retained here so callers (route / tool wrapper) can apply
 * post-hoc authorization filtering; downstream consumers should not expose it
 * in their response shape.
 *
 * Optional fields (`content`, `description`, `tags`, `references`) are omitted
 * when the caller passes a `fields` array that excludes them. `spaces` and
 * `permissions` are internal pipeline details — not present in results.
 */
export interface SmlSearchResult {
  id: string;
  type: string;
  title: string;
  origin: { uri: string };
  content?: string;
  description?: string;
  references?: Array<{ uri: string }>;
  tags?: string[];
  spaces?: string[];
  permissions?: SmlPermissions;
}

/**
 * One `discovery_labels` nested entry that matched an autocomplete prefix query.
 * Surfaced via `inner_hits`.
 */
export interface MatchedDiscoveryLabel {
  value: string;
  kind: string;
  /**
   * The matched span within `value`, wrapped in `<em>...</em>` tags. Present
   * when ES returned a highlight snippet for this inner hit; absent if not.
   * Example: typed prefix `"git"` against value `"github"` produces `"<em>git</em>hub"`.
   */
  highlighted?: string;
}

/**
 * An SML autocomplete result — narrower than {@link SmlSearchResult}, tuned for
 * @ menu / typeahead rendering. Drops bulk content (`content`, `description`,
 * `extended_attrs`, etc.) and surfaces per-row provenance.
 */
export interface SmlAutocompleteResult {
  id: string;
  type: string;
  title: string;
  origin: { uri: string };
  /** Used server-side for permission filtering; not exposed in the HTTP response. */
  permissions: SmlPermissions;
  /** Used server-side for space filtering; not exposed in the HTTP response. */
  spaces: string[];
  /**
   * The specific `discovery_labels` entries that matched the typed prefix.
   * `kind` lets the UI render each label appropriately — e.g. for a hit on the
   * record's title vs. on a producer-supplied tagline, the UI can decide whether
   * (and how) to surface the matched span.
   */
  matched_discovery_labels?: MatchedDiscoveryLabel[];
}

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
 * Filter parameters for SML search.
 * Re-exported from the shared HTTP API types so server and client use a single definition.
 */
export type { SmlSearchFilters, SmlSearchConstraints } from '../../../common/http_api/sml';

/**
 * Scope selector for `deleteAttachment` and the `deleteAttachment` start
 * contract method.
 *
 * - `'crawled'` (default) — remove crawler output only; preserve curated manual
 *   entries. This matches the historical behavior of
 *   `indexAttachment({ action: 'delete' })` and the crawler's own semantic.
 * - `'manual'` — remove curated manual entries; preserve crawled output.
 * - `'all'` — remove the entry for the `origin_id` regardless of how it was
 *   produced. Use when the caller "owns" the origin and is fully retiring it
 *   (e.g. a workflow that wrote the entry and is now cleaning up).
 */
export type SmlDeleteScope = SmlIngestionMethod | 'all';

/**
 * Origin-mode mixin for `indexAttachment`.
 *
 * Content is produced by the registered type's `getSmlEntry` hook. The
 * resulting entry is tagged `ingestion_method: 'crawled'`. If the target
 * `origin_id` already has an `ingestion_method: 'manual'` entry, the call
 * is a no-op unless `force: true` is provided.
 */
export interface SmlIndexAttachmentOriginMode {
  /** Override existing manual entries. Default: false. */
  force?: boolean;
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

/**
 * Internal params for `indexAttachment`. Origin-mode only — content is always
 * resolved via the registered type's `getSmlEntry` hook.
 */
export type SmlIndexerParams = SmlIndexerOriginParams;

/**
 * Internal params for `SmlIndexer.deleteAttachment` and
 * `SmlService.deleteAttachment`. Shape mirrors `SmlIndexerBaseParams` minus
 * `action` (the method itself implies delete) and adds the `ingestionMethod`
 * scope selector that lets callers wipe more than just the crawled entry.
 *
 * @remarks
 * `spaces` controls which entries are deleted: only entries whose stored
 * `spaces` array contains at least one of the provided space IDs (or the
 * wildcard `'*'`) are removed. HTTP-path callers (PUT/DELETE routes) pass
 * `[spaceId]` so the delete is scoped to the caller's space and entries
 * belonging to other spaces are left intact.
 *
 * Crawler origin-mode paths omit `spaces` (via `indexAttachment`) so
 * their deletes remain global — the crawler owns the full origin across
 * all spaces and must be able to wipe a stale entry regardless of which
 * space it was written from.
 */
export interface SmlIndexerDeleteAttachmentParams {
  originId: string;
  attachmentType: string;
  /**
   * Space-isolation guard. `deleteEntry` filters by
   * `{ terms: { spaces: [...spaces, '*'] } }` so only an entry whose stored
   * `spaces` array contains one of the provided IDs (or the global wildcard
   * `'*'`) is removed. See type-level `@remarks` for the full contract.
   */
  spaces: string[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
  logger: Logger;
  /** Defaults to `'crawled'`. Pass `'all'` to fully retire the origin. */
  ingestionMethod?: SmlDeleteScope;
}

/**
 * SML service interface — exposed on the plugin start contract.
 */
export interface SmlService {
  /** Get the crawler instance (for task manager integration) */
  getCrawler: () => SmlCrawler;
  /**
   * Hybrid search the SML index (RRF over BM25 + semantic), filtering results
   * by space, constraints, agent-supplied filters, and permissions.
   *
   * `constraints` and `filters` are kept as separate parameters so the trust
   * boundary is visible at the API layer: `constraints` is runtime-imposed
   * (wrapper-applied from caller context — agent SO `connector_ids`, future
   * allowed-indices, RBAC) and the agent can't bypass it; `filters` is the
   * agent-discoverable refinement (`types[]`, `tags[]`). Both are combined
   * server-side; agent filters never widen the scope.
   */
  search: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    /**
     * Optional fields to include beyond the baseline (`id`, `type`, `title`,
     * `description`). Valid opt-in values: `'content'`, `'tags'`,
     * `'references'`, `'spaces'`, `'permissions'`.
     */
    fields?: string[];
    /** Runtime-imposed per-type id-allowlist constraints. See {@link SmlSearchConstraints}. */
    constraints?: SmlSearchConstraints;
    /** Agent-discoverable filters. See {@link SmlSearchFilters}. */
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlSearchResult[] }>;

  /**
   * Autocomplete / typeahead against the SML index. A single nested
   * `multi_match bool_prefix operator: and` against `discovery_labels.value`
   * (search_as_you_type) and its `_2gram` / `_3gram` subfields. Returns per-row
   * provenance for UI badges. Filters by space and permissions the same way
   * as `search`, and accepts the same per-type `constraints` and caller-supplied
   * `filters` so a specialized UI picker (e.g. connectors-only or dashboards-only
   * @ menu) can restrict results without any LLM involvement.
   */
  autocomplete: (params: {
    query: string;
    size?: number;
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
    /** Runtime-imposed per-type id-allowlist constraints. See {@link SmlSearchConstraints}. */
    constraints?: SmlSearchConstraints;
    /** Caller-supplied type/tag refinements. See {@link SmlSearchFilters}. */
    filters?: SmlSearchFilters;
  }) => Promise<{ results: SmlAutocompleteResult[] }>;

  /**
   * Check whether the current user has access to specific SML items.
   * Returns a map of document id → authorized (true/false).
   *
   * **Internal use only.** This primitive is exposed on the internal
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
   * Delete the entry for an origin, with explicit control over which ingestion
   * method(s) are removed. See {@link SmlIndexerDeleteAttachmentParams}.
   *
   * Distinct from `indexAttachment({ action: 'delete' })` only in that
   * callers can choose to wipe a `'manual'` or `'all'` entry. Without this
   * method, the action: 'delete' path defaults to `'crawled'` to preserve
   * the historical crawler/event-driven semantics (delete crawled output,
   * keep curated manuals).
   */
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;

  /**
   * Fetch SML documents by their IDs, scoped to a space.
   *
   * **Internal use only — does NOT perform permission checks.** Direct callers
   * MUST authorize IDs (via `checkItemsAccess`) before invoking this method,
   * or use it only from system contexts where the user's privileges are
   * irrelevant (e.g. crawler/indexer tasks).
   */
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
