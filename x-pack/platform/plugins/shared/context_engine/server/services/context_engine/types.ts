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
import type {
  ContextEngineSearchFilters,
  ContextEngineSearchConstraints,
} from '../../../common/http_api/context_engine';

/**
 * One entry in {@link ContextEngineEntry.discovery_labels}. `value` is what the autocomplete
 * matches against; `kind` describes how the UI should render the matched label.
 *
 * `kind` is open (free-form keyword at the ES level). The indexer auto-prepends
 * entries with `kind: 'title'` and `kind: 'type'` derived from the entry's title
 * and type fields. Producers can add additional entries with any kind (e.g.
 * 'tagline', 'nickname', 'category', 'synonym') — the UI decides how to render
 * each kind.
 */
export interface DiscoveryLabel {
  value: string;
  kind: string;
}

/**
 * A single Kibana feature privilege required to access a entry
 * (e.g., `saved_object:lens/get`, `action:execute`).
 */
export interface ContextEngineKibanaPrivilege {
  name: string;
}

/**
 * A single concrete Elasticsearch index / alias / data stream name whose
 * data a entry's content depends on. Used by the search-time post-filter
 * to gate entries behind the user's ES `read` privilege on each name.
 */
export interface ContextEngineElasticsearchIndex {
  name: string;
}

/**
 * Permissions required to access a entry, split by access boundary.
 *
 * Both sub-objects are always present (with possibly-empty arrays) on
 * stored documents to keep the schema rigid and predictable.
 */
export interface ContextEnginePermissions {
  kibana: { privileges: ContextEngineKibanaPrivilege[] };
  elasticsearch: { indices: ContextEngineElasticsearchIndex[] };
}

/**
 * A single Context Engine entry to be indexed.
 */
export interface ContextEngineEntry {
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
   * and `title`. Each label carries a `kind` so the UI can render it appropriately
   * (e.g. as a tagline, nickname, category, or synonym). Indexed as a nested field;
   * the autocomplete surface queries `discovery_labels.value` (SAYT) with
   * `multi_match bool_prefix` and uses `inner_hits` to surface which entry
   * matched.
   *
   * Example for a GitHub connector:
   *   [
   *     { value: 'github',          kind: 'tagline' },
   *     { value: 'gh',              kind: 'nickname' },
   *     { value: 'version control', kind: 'category' },
   *   ]
   */
  discovery_labels?: DiscoveryLabel[];
  /**
   * Type-specific structured data. Stored as `flattened` so leaves are
   * keyword-searchable for sub-path filtering. Context Engine treats this opaquely;
   * type writers own its shape.
   */
  extended_attrs?: Record<string, unknown>;
  /** Owner or last-modifier user id when known */
  user_id?: string;
  /** Other Context Engine entries this item references. Each entry carries a `uri` field; the object shape allows sub-fields (e.g. relationship kind) without a future migration. */
  references?: Array<{ uri: string }>;
  // permissions: intentionally absent. The {@link ContextEngineTypeDefinition.getPermissions}
  // hook is the single source of truth for the permissions stamped on the
  // indexed document — neither `getContextEngineData` nor content-mode callers (the
  // `contextEngine.index` workflow step, event-driven content-mode indexAttachment)
  // can override it.
}

/**
 * Return value from getContextEngineData — normalized data to index.
 */
export interface ContextEngineData {
  entries: ContextEngineEntry[];
}

/**
 * Context passed to Context Engine type hooks (`list` and `getContextEngineData`).
 */
export interface ContextEngineContext {
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

/**
 * Context passed to the toAttachment hook.
 */
export interface ContextEngineToAttachmentContext {
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  spaceId: string;
}

/**
 * An item returned by the `list` hook of an Context Engine type.
 */
export interface ContextEngineListItem {
  /** Unique ID of the attachment (e.g., saved object ID) */
  id: string;
  /** Last updated timestamp — used by crawler for change detection */
  updatedAt: string;
  /** Space IDs this item belongs to */
  spaces: string[];
}

/**
 * Server-side type definition for Context Engine (Context Engine).
 *
 * Registered via `contextEngine.registerType()` during plugin setup.
 *
 * Solutions register these to make their content discoverable via the Context Engine.
 */
export interface ContextEngineTypeDefinition {
  /** Unique identifier for this Context Engine type (e.g., 'dashboard', 'lens', 'esql') */
  id: string;

  /**
   * Yield pages of items to consider for indexing.
   * Called by the crawler to enumerate candidates.
   * Each yielded array is one page; the crawler processes pages
   * with O(page_size) memory instead of loading everything at once.
   */
  list: (context: ContextEngineContext) => AsyncIterable<ContextEngineListItem[]>;

  /**
   * Return normalized data to index for a specific item.
   */
  getContextEngineData: (
    originId: string,
    context: ContextEngineContext
  ) => Promise<ContextEngineData | undefined>;

  /**
   * Convert an Context Engine document into a conversation attachment.
   */
  toAttachment: (
    item: ContextEngineDocument,
    context: ContextEngineToAttachmentContext
  ) => Promise<AttachmentInput<string, unknown> | undefined>;

  /**
   * Compute the {@link ContextEnginePermissions} that gate access to entries for the
   * given `originId`. Called by the indexer for every entry it stamps,
   * regardless of which mode (crawler/origin vs. workflow/content) wrote
   * the entry — so a workflow step's content-mode write inherits the same
   * gating as a crawler-driven write.
   *
   * Authoritative when defined. Callers (workflow step, `getContextEngineData`) cannot
   * override or bypass it — `ContextEngineEntry` does not carry a `permissions`
   * field. Types that need permission shapes the built-in helpers do not
   * cover should still implement this directly (returning a fully-shaped
   * {@link ContextEnginePermissions}).
   *
   * Omit when the type wraps a resource that is intentionally public within
   * the space (e.g. taxonomy entries, public schema docs). The indexer then
   * stamps an empty `ContextEnginePermissions`, which the read-path security filter
   * treats as "no privileges required". A type that wraps a sensitive
   * resource MUST implement this hook — there is no other way to attach an
   * access-control gate to its entries.
   *
   * For Kibana saved-object-backed types, prefer the
   * `kibanaSavedObjectPermissions` helper over hand-writing the privilege
   * string.
   */
  getPermissions?: (
    originId: string,
    context: ContextEngineContext
  ) => Promise<ContextEnginePermissions> | ContextEnginePermissions;

  /**
   * Optional: custom crawl interval for the crawler.
   * Defaults to '10m' if not provided.
   */
  fetchFrequency?: () => string;
}

/**
 * How a entry was produced.
 *
 * - `'crawled'`: written by the Context Engine crawler or by an event-driven `indexAttachment`
 *   origin-mode call (content fetched via `getContextEngineData`).
 * - `'manual'`: written explicitly by a user/admin — via the HTTP upsert route or via
 *   `indexAttachment` content-mode. Manual entries are protected from being overwritten
 *   by the crawler / origin-mode `indexAttachment` unless `force: true` is passed.
 */
export type ContextEngineIngestionMethod = 'manual' | 'crawled';

/**
 * An Context Engine document as stored in the system index.
 */
export interface ContextEngineDocument {
  /** Unique id of the entry */
  id: string;
  /** Context Engine type (e.g., 'visualization', 'dashboard') */
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
  /** Other Context Engine entries this item references. Each entry carries a `uri` field; the object shape allows sub-fields (e.g. relationship kind) without a future migration. */
  references?: Array<{ uri: string }>;
  /** Timestamp when first created */
  created_at: string;
  /** Timestamp when last updated */
  updated_at: string;
  /** Space IDs this item belongs to */
  spaces: string[];
  /**
   * Permissions required to access the underlying element. Always present
   * on stored documents; inner arrays may be empty.
   */
  permissions: ContextEnginePermissions;
  /** How this entry was produced. */
  ingestion_method: ContextEngineIngestionMethod;
}

/**
 * Compact Context Engine search result — LLM-shaped. Drops the full `content` blob, the
 * full `extended_attrs`, and bookkeeping fields. Callers fetch full content via the
 * lookup tool (`context_engine_read`) when they need it.
 *
 * `permissions` is retained here so callers (route / tool wrapper) can apply
 * post-hoc authorization filtering; downstream consumers should not expose it
 * in their response shape.
 *
 * Optional fields (`content`, `description`, `tags`, `references`) are omitted
 * when the caller passes a `fields` array that excludes them. `spaces` and
 * `permissions` are internal pipeline details — not present in results.
 */
export interface ContextEngineSearchResult {
  id: string;
  type: string;
  title: string;
  origin: { uri: string };
  content?: string;
  description?: string;
  references?: Array<{ uri: string }>;
  tags?: string[];
  spaces?: string[];
  permissions?: ContextEnginePermissions;
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
 * An Context Engine autocomplete result — narrower than {@link ContextEngineSearchResult}, tuned for
 * @ menu / typeahead rendering. Drops bulk content (`content`, `description`,
 * `extended_attrs`, etc.) and surfaces per-row provenance.
 */
export interface ContextEngineAutocompleteResult {
  id: string;
  type: string;
  title: string;
  origin: { uri: string };
  /** Used server-side for permission filtering; not exposed in the HTTP response. */
  permissions: ContextEnginePermissions;
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
export interface ContextEngineCrawlerStateDocument {
  /** Origin ID (e.g., saved object ID) */
  origin_id: string;
  /** Context Engine type definition ID (e.g., 'visualization') */
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
 * Action to index an Context Engine attachment.
 */
export type ContextEngineIndexAction = 'create' | 'update' | 'delete';

/**
 * The Context Engine crawler enumerates registered Context Engine types, compares the current state
 * with what has been previously indexed, and queues create/update/delete actions
 * to be processed by the indexer.
 */
export interface ContextEngineCrawler {
  crawl: (params: {
    definition: ContextEngineTypeDefinition;
    esClient: ElasticsearchClient;
    savedObjectsClient: ISavedObjectsRepository;
    abortSignal?: AbortSignal;
  }) => Promise<void>;
}

/**
 * Filter parameters for Context Engine search.
 * Re-exported from the shared HTTP API types so server and client use a single definition.
 */
export type {
  ContextEngineSearchFilters,
  ContextEngineSearchConstraints,
} from '../../../common/http_api/context_engine';

/**
 * Scope selector for `deleteAttachment` and the `deleteAttachment` start
 * contract method.
 *
 * - `'crawled'` (default) — remove crawler output only; preserve curated manual
 *   entries. This matches the historical behavior of
 *   `indexAttachment({ action: 'delete' })` and the crawler's own semantic.
 * - `'manual'` — remove curated manual entries; preserve crawled output.
 * - `'all'` — remove every entry for the `origin_id` regardless of how it was
 *   produced. Use when the caller "owns" the origin and is fully retiring it
 *   (e.g. a workflow that wrote entries and is now cleaning up).
 */
export type ContextEngineDeleteScope = ContextEngineIngestionMethod | 'all';

/**
 * Mode discriminator for `indexAttachment`.
 *
 * The two mixins below define the discriminated half of the parameter object.
 * They are combined with a layer-specific "base" (public vs internal) to form
 * the full unions: `ContextEngineIndexAttachmentParams` (public, in `server/types.ts`)
 * and `ContextEngineIndexerParams` (internal, below).
 *
 * Origin mode — content is produced by the registered type's `getContextEngineData`
 * hook. Resulting entries are tagged `ingestion_method: 'crawled'`. If the
 * target `origin_id` already has any `ingestion_method: 'manual'` entries, the
 * call is a no-op unless `force: true` is provided.
 */
export interface ContextEngineIndexAttachmentOriginMode {
  /** Override existing manual entries. Default: false. */
  force?: boolean;
  content?: undefined;
}

/**
 * Content mode — caller supplies pre-built entries directly; `getContextEngineData` is
 * not called. Resulting entries are tagged `ingestion_method: 'manual'`. Always
 * overwrites existing entries for the `origin_id`.
 */
export interface ContextEngineIndexAttachmentContentMode {
  /** Pre-built entries; skips getContextEngineData; marks `ingestion_method='manual'`. */
  content: ContextEngineEntry[];
  force?: undefined;
  /**
   * `created_at` to stamp on the written entries. When provided (e.g. the
   * HTTP PUT route passes the value from the existing entry so updates
   * preserve the original creation timestamp), the entries are written with
   * this value instead of the current time. Omit on first-write — the
   * indexer will stamp `now`.
   */
  createdAt?: string;
  /**
   * Caller-supplied permissions to stamp on the written entries, used only
   * when `attachmentType` has no `getPermissions` hook. Conflicts with a
   * hook-backed type — see {@link ContextEnginePermissionsConflictError}.
   */
  permissions?: ContextEnginePermissions;
}

/**
 * Common params shared by both modes of the internal `indexAttachment` flow
 * (`ContextEngineService.indexAttachment` and `ContextEngineIndexer.indexAttachment`).
 *
 * Unlike the public-contract `ContextEngineIndexAttachmentParams` (`server/types.ts`), this
 * type has no `request` / `spaceId` — by the time the call reaches the service or
 * indexer, the public wrapper has already resolved a scoped saved-objects client,
 * an internal ES client, and the space list.
 */
interface ContextEngineIndexerBaseParams {
  originId: string;
  attachmentType: string;
  action: ContextEngineIndexAction;
  spaces: string[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
  logger: Logger;
}

export type ContextEngineIndexerOriginParams = ContextEngineIndexerBaseParams &
  ContextEngineIndexAttachmentOriginMode;
export type ContextEngineIndexerContentParams = ContextEngineIndexerBaseParams &
  ContextEngineIndexAttachmentContentMode;

/**
 * Discriminated union for the internal `indexAttachment` flow. Shared between
 * `ContextEngineService.indexAttachment` and `ContextEngineIndexer.indexAttachment`.
 */
export type ContextEngineIndexerParams =
  | ContextEngineIndexerOriginParams
  | ContextEngineIndexerContentParams;

/**
 * Internal params for `ContextEngineIndexer.deleteAttachment` and
 * `ContextEngineService.deleteAttachment`. Shape mirrors `ContextEngineIndexerBaseParams` minus
 * `action` (the method itself implies delete) and adds the `ingestionMethod`
 * scope selector that lets callers wipe more than just crawled entries.
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
 * all spaces and must be able to wipe stale entries regardless of which
 * space they were written from.
 */
export interface ContextEngineIndexerDeleteAttachmentParams {
  originId: string;
  attachmentType: string;
  /**
   * Space-isolation guard. `deleteEntries` filters by
   * `{ terms: { spaces: [...spaces, '*'] } }` so only entries whose stored
   * `spaces` array contains one of the provided IDs (or the global wildcard
   * `'*'`) are removed. See type-level `@remarks` for the full contract.
   */
  spaces: string[];
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract | ISavedObjectsRepository;
  logger: Logger;
  /** Defaults to `'crawled'`. Pass `'all'` to fully retire the origin. */
  ingestionMethod?: ContextEngineDeleteScope;
}

/**
 * Context Engine service interface — exposed on the plugin start contract.
 */
export interface ContextEngineService {
  /** Get the crawler instance (for task manager integration) */
  getCrawler: () => ContextEngineCrawler;
  /**
   * Hybrid search the Context Engine index (RRF over BM25 + semantic), filtering results
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
    /** Runtime-imposed per-type id-allowlist constraints. See {@link ContextEngineSearchConstraints}. */
    constraints?: ContextEngineSearchConstraints;
    /** Agent-discoverable filters. See {@link ContextEngineSearchFilters}. */
    filters?: ContextEngineSearchFilters;
  }) => Promise<{ results: ContextEngineSearchResult[] }>;

  /**
   * Autocomplete / typeahead against the Context Engine index. A single nested
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
    /** Runtime-imposed per-type id-allowlist constraints. See {@link ContextEngineSearchConstraints}. */
    constraints?: ContextEngineSearchConstraints;
    /** Caller-supplied type/tag refinements. See {@link ContextEngineSearchFilters}. */
    filters?: ContextEngineSearchFilters;
  }) => Promise<{ results: ContextEngineAutocompleteResult[] }>;

  /**
   * Check whether the current user has access to specific Context Engine items.
   * Returns a map of document id → authorized (true/false).
   *
   * **Internal use only.** Callers outside the plugin should use the public
   * `getDocuments` method, which performs this check internally and returns
   * only authorized documents. This primitive is exposed on the internal
   * `ContextEngineService` so `resolveAttachItems` can distinguish "access denied"
   * from "not found" in its per-item error messages.
   */
  checkItemsAccess: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
    request: KibanaRequest;
  }) => Promise<Map<string, boolean>>;

  /** Index a single attachment (event-driven or manual). See {@link ContextEngineIndexerParams}. */
  indexAttachment: (params: ContextEngineIndexerParams) => Promise<void>;

  /**
   * Delete entries for an origin, with explicit control over which ingestion
   * method(s) are removed. See {@link ContextEngineIndexerDeleteAttachmentParams}.
   *
   * Distinct from `indexAttachment({ action: 'delete' })` only in that
   * callers can choose to wipe `'manual'` or `'all'` entries. Without this
   * method, the action: 'delete' path defaults to `'crawled'` to preserve
   * the historical crawler/event-driven semantics (delete crawled output,
   * keep curated manuals).
   */
  deleteAttachment: (params: ContextEngineIndexerDeleteAttachmentParams) => Promise<void>;

  /**
   * Fetch Context Engine documents by their entry IDs, scoped to a space.
   *
   * **Internal use only — does NOT perform permission checks.** The public
   * `ContextEnginePluginStart.getDocuments` wraps this with an access
   * check and filters out unauthorized IDs before fetching. Direct callers
   * MUST authorize IDs (via `checkItemsAccess`) before invoking this method,
   * or use it only from system contexts where the user's privileges are
   * irrelevant (e.g. crawler/indexer tasks).
   */
  getDocuments: (params: {
    ids: string[];
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<Map<string, ContextEngineDocument>>;

  /** List Context Engine documents in a space with optional filters and pagination. */
  listDocuments: (params: {
    spaceId: string;
    esClient: IScopedClusterClient;
    page?: number;
    perPage?: number;
    type?: string;
    originUri?: string;
    tags?: string[];
  }) => Promise<{ total: number; results: ContextEngineDocument[] }>;

  /**
   * Fetch every entry written under the compound `(type, originId)`
   * key that is visible in `spaceId`.
   *
   * Used by the HTTP GET route and other origin-scoped reads. A workflow
   * step writing in content mode (or `getContextEngineData` in origin mode) may
   * produce multiple entries per origin — all are returned.
   *
   * The caller MUST pass both `type` and `originId`. The bare
   * `originId` is not unique on its own (a `lens` entry and a
   * `dashboard` entry may legitimately share an id), so the lookup
   * keys against the canonical `origin.uri = ${type}://${originId}`.
   *
   * Resolves to an empty array when no visible entries exist; callers
   * that need the "exists in another space" distinction (for
   * cross-space write guards) should use
   * {@link ContextEngineService.findByOriginAcrossSpaces}.
   *
   * **Does NOT perform per-user permission checks.** The caller is
   * expected to have already authorized the user against the space.
   * Direct callers from request-handling contexts should layer their own
   * `checkItemsAccess` filter on top — or wait for the route helper that
   * does this for them.
   */
  findByOrigin: (params: {
    type: string;
    originId: string;
    spaceId: string;
    esClient: IScopedClusterClient;
  }) => Promise<ContextEngineDocument[]>;

  /**
   * Fetch every entry written under the compound `(type, originId)`
   * key regardless of space.
   *
   * Used exclusively for the HTTP route's cross-space-overwrite guard:
   * a write request from space A must be blocked when the origin is
   * already owned by space B. Callers MUST NOT use this for read paths
   * that surface data to users — it bypasses space isolation.
   */
  findByOriginAcrossSpaces: (params: {
    type: string;
    originId: string;
    esClient: IScopedClusterClient;
  }) => Promise<ContextEngineDocument[]>;

  /** Get a type definition by ID */
  getTypeDefinition: (typeId: string) => ContextEngineTypeDefinition | undefined;

  /** List all registered type definitions */
  listTypeDefinitions: () => ContextEngineTypeDefinition[];
}
