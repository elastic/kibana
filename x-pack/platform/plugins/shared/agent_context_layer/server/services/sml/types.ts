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
 * One entry in {@link SmlChunk.discovery_labels}. `value` is what the autocomplete
 * matches against; `kind` describes how the UI should render the matched label.
 *
 * `kind` is open (free-form keyword at the ES level). The indexer auto-prepends
 * entries with `kind: 'title'` and `kind: 'type'` derived from the chunk's title
 * and type fields. Producers can add additional entries with any kind (e.g.
 * 'tagline', 'nickname', 'category', 'synonym') — the UI decides how to render
 * each kind.
 */
export interface DiscoveryLabel {
  value: string;
  kind: string;
}

/**
 * A single Kibana feature privilege required to access a chunk
 * (e.g., `saved_object:lens/get`, `action:execute`).
 */
export interface SmlKibanaPrivilege {
  name: string;
}

/**
 * A single concrete Elasticsearch index / alias / data stream name whose
 * data a chunk's content depends on. Used by the search-time post-filter
 * to gate chunks behind the user's ES `read` privilege on each name.
 */
export interface SmlElasticsearchIndex {
  name: string;
}

/**
 * Permissions required to access a chunk, split by access boundary.
 *
 * Both sub-objects are always present (with possibly-empty arrays) on
 * stored documents to keep the schema rigid and predictable.
 */
export interface SmlPermissions {
  kibana: { privileges: SmlKibanaPrivilege[] };
  elasticsearch: { indices: SmlElasticsearchIndex[] };
}

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
   * keyword-searchable for sub-path filtering. SML treats this opaquely;
   * type writers own its shape.
   */
  extended_attrs?: Record<string, unknown>;
  /** Owner or last-modifier user id when known */
  user_id?: string;
  /** Other SML entries this item references. Each entry carries a `uri` field; the object shape allows sub-fields (e.g. relationship kind) without a future migration. */
  references?: Array<{ uri: string }>;
  // permissions: intentionally absent. The {@link SmlTypeDefinition.getPermissions}
  // hook is the single source of truth for the permissions stamped on the
  // indexed document — neither `getSmlData` nor content-mode callers (the
  // `sml.index` workflow step, event-driven content-mode indexAttachment)
  // can override it.
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
   * Compute the {@link SmlPermissions} that gate access to chunks for the
   * given `originId`. Called by the indexer for every chunk it stamps,
   * regardless of which mode (crawler/origin vs. workflow/content) wrote
   * the chunk — so a workflow step's content-mode write inherits the same
   * gating as a crawler-driven write.
   *
   * Authoritative when defined. Callers (workflow step, `getSmlData`) cannot
   * override or bypass it — `SmlChunk` does not carry a `permissions`
   * field. Types that need permission shapes the built-in helpers do not
   * cover should still implement this directly (returning a fully-shaped
   * {@link SmlPermissions}).
   *
   * Omit when the type wraps a resource that is intentionally public within
   * the space (e.g. taxonomy entries, public schema docs). The indexer then
   * stamps an empty `SmlPermissions`, which the read-path security filter
   * treats as "no privileges required". A type that wraps a sensitive
   * resource MUST implement this hook — there is no other way to attach an
   * access-control gate to its chunks.
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
   * on stored documents; inner arrays may be empty.
   */
  permissions: SmlPermissions;
  /** How this chunk was produced. */
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
 * - `'all'` — remove every chunk for the `origin_id` regardless of how it was
 *   produced. Use when the caller "owns" the origin and is fully retiring it
 *   (e.g. a workflow that wrote chunks and is now cleaning up).
 */
export type SmlDeleteScope = SmlIngestionMethod | 'all';

/**
 * Mode discriminator for `indexAttachment`.
 *
 * The two mixins below define the discriminated half of the parameter object.
 * They are combined with a layer-specific "base" (public vs internal) to form
 * the full unions: `SmlIndexAttachmentParams` (public, in `server/types.ts`)
 * and `SmlIndexerParams` (internal, below).
 *
 * Origin mode — content is produced by the registered type's `getSmlData`
 * hook. Resulting chunks are tagged `ingestion_method: 'crawled'`. If the
 * target `origin_id` already has any `ingestion_method: 'manual'` chunks, the
 * call is a no-op unless `force: true` is provided.
 */
export interface SmlIndexAttachmentOriginMode {
  /** Override existing manual entries. Default: false. */
  force?: boolean;
  content?: undefined;
}

/**
 * Content mode — caller supplies pre-built chunks directly; `getSmlData` is
 * not called. Resulting chunks are tagged `ingestion_method: 'manual'`. Always
 * overwrites existing chunks for the `origin_id`.
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
 * Internal params for `SmlIndexer.deleteAttachment` and
 * `SmlService.deleteAttachment`. Shape mirrors `SmlIndexerBaseParams` minus
 * `action` (the method itself implies delete) and adds the `ingestionMethod`
 * scope selector that lets callers wipe more than just crawled chunks.
 *
 * @remarks
 * `spaces` is informational only: the delete operates on the global
 * `(origin_id, attachmentType[, ingestion_method])` selector and never
 * filters by space. The field is forwarded to the structured log line
 * emitted at the start of `deleteAttachment` so operators can correlate
 * the request with the caller's space, but it has no effect on which
 * documents are removed. The cross-space-overwrite/visibility guard
 * has to live at the route layer (see `delete.ts`) — the indexer can't
 * gate on space without breaking the crawler's tombstoning path, which
 * legitimately runs without a calling space context.
 *
 * Keeping the field shape-symmetric with `SmlIndexerBaseParams` rather
 * than dropping it costs nothing and lets every call site stay
 * uniform; refactoring it out would be a sweeping change for no
 * functional gain.
 */
export interface SmlIndexerDeleteAttachmentParams {
  originId: string;
  attachmentType: string;
  /**
   * Log-only. See type-level `@remarks` — the indexer does NOT use this
   * to filter the underlying `deleteByQuery`; selection is global by
   * `(origin_id, attachmentType[, ingestion_method])`. Space-scope
   * enforcement is a route-layer concern.
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
   * Delete chunks for an origin, with explicit control over which ingestion
   * method(s) are removed. See {@link SmlIndexerDeleteAttachmentParams}.
   *
   * Distinct from `indexAttachment({ action: 'delete' })` only in that
   * callers can choose to wipe `'manual'` or `'all'` chunks. Without this
   * method, the action: 'delete' path defaults to `'crawled'` to preserve
   * the historical crawler/event-driven semantics (delete crawled output,
   * keep curated manuals).
   */
  deleteAttachment: (params: SmlIndexerDeleteAttachmentParams) => Promise<void>;

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
    originUri?: string;
    tags?: string[];
  }) => Promise<{ total: number; results: SmlDocument[] }>;

  /**
   * Fetch every chunk written under the compound `(type, originId)`
   * key that is visible in `spaceId`.
   *
   * Used by the HTTP GET route and other origin-scoped reads. A workflow
   * step writing in content mode (or `getSmlData` in origin mode) may
   * produce multiple chunks per origin — all are returned.
   *
   * The caller MUST pass both `type` and `originId`. The bare
   * `originId` is not unique on its own (a `lens` chunk and a
   * `dashboard` chunk may legitimately share an id), so the lookup
   * keys against the canonical `origin.uri = ${type}://${originId}`.
   *
   * Resolves to an empty array when no visible chunks exist; callers
   * that need the "exists in another space" distinction (for
   * cross-space write guards) should use
   * {@link SmlService.findByOriginAcrossSpaces}.
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
  }) => Promise<SmlDocument[]>;

  /**
   * Fetch every chunk written under the compound `(type, originId)`
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
  }) => Promise<SmlDocument[]>;

  /** Get a type definition by ID */
  getTypeDefinition: (typeId: string) => SmlTypeDefinition | undefined;

  /** List all registered type definitions */
  listTypeDefinitions: () => SmlTypeDefinition[];
}
