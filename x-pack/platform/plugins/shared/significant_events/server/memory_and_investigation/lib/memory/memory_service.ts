/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  RetrieverContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { badRequest, notFound } from '@hapi/boom';
import { DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/significant-events-schema';
import { createMemoryHistoryStorage } from './history_storage';
import { type StoredMemoryPage } from './data_stream';
import { MEMORIES_DATA_STREAM } from '../../../../common/memory_and_investigation';
import { resolveSearchMode, type SearchMode } from '../../../../common/queries';
import type {
  MemoryEntry,
  MemoryVersionRecord,
  MemoryChangeType,
  MemoryCategoryNode,
  MemorySearchResult,
  CreateMemoryParams,
  UpdateMemoryParams,
  SearchMemoryParams,
  MemoryService,
} from './types';

const isIndexNotFoundError = (err: unknown): boolean => {
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode === 404) return true;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes('index_not_found_exception');
};

/** Upper bound on distinct pages resolved in a single search. */
const MAX_PAGES = 10000;

/** Telemetry decay half-life of 7 days in seconds. */
const HALF_LIFE_SEC = 7 * 24 * 3600;
const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_SEC;

/**
 * Calculates statistical confidence for memory selection using simple impression saturation.
 */
const calculateConfidence = (imp: number, conv: number): number => {
  if (imp <= 0) return 0;
  return Math.min(1, imp / 50.0); // Simple saturation confidence at 50 impressions
};

/**
 * Maps standard, nested Elasticsearch StoredMemoryPage fields into flat logical MemoryEntry properties.
 */
const toMemoryEntry = (id: string, stored: StoredMemoryPage): MemoryEntry => {
  const attrs = stored.attributes as Record<string, any> || {};
  return {
    id,
    space_id: attrs.space_id ?? 'default',
    name: attrs.name ?? '',
    title: stored.title ?? '',
    content: stored.content ?? '',
    categories: attrs.categories ?? [],
    references: attrs.references ?? [],
    tags: stored.tags ?? [],
    created_at: attrs.created_at ?? stored['@timestamp'] ?? new Date().toISOString(),
    updated_at: attrs.updated_at ?? stored['@timestamp'] ?? new Date().toISOString(),
    created_by: attrs.created_by ?? '',
    updated_by: attrs.updated_by ?? '',
    ...(attrs.telemetry && {
      telemetry: {
        impressions: attrs.telemetry.impressions ?? 0,
        conversions: attrs.telemetry.conversions ?? 0,
        last_impression_time: attrs.telemetry.last_impression_time ?? new Date().toISOString(),
      },
    }),
  };
};

/**
 * Maps logical flat MemoryEntry properties back into standard nested Elasticsearch document mappings.
 */
const toStoredMemoryPage = (entry: MemoryEntry): StoredMemoryPage => {
  return {
    '@timestamp': entry.updated_at,
    id: entry.id,
    type: 'memory',
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    attributes: {
      space_id: entry.space_id,
      name: entry.name,
      categories: entry.categories,
      references: entry.references,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      created_by: entry.created_by,
      updated_by: entry.updated_by,
      ...(entry.telemetry && { telemetry: entry.telemetry }),
    },
  };
};

/**
 * Applies on-the-fly continuous exponential decay and usefulness ranking to returned memory results.
 */
const applyTelemetryDecayAndLabelling = (entry: MemoryEntry, nowMs: number = Date.now()): MemoryEntry => {
  if (!entry.telemetry) {
    return {
      ...entry,
      labels: { useful: 0, confidence: 0 },
    };
  }

  const tel = entry.telemetry;
  const lastTime = new Date(tel.last_impression_time).getTime();
  const timeDiffSec = Math.max(0, (nowMs - lastTime) / 1000.0);
  const decayFactor = Math.exp(-DECAY_LAMBDA * timeDiffSec);

  const decayedImp = tel.impressions * decayFactor;
  const decayedConv = tel.conversions * decayFactor;

  const useful = decayedImp > 0 ? (decayedConv / decayedImp) : 0;
  const confidence = calculateConfidence(decayedImp, decayedConv);

  return {
    ...entry,
    labels: { useful, confidence },
  };
};

/**
 * MemoryServiceImpl backed by a standard, unified Elasticsearch Index (ai-index-idx-significant-events-memories).
 * This eliminates legacy version-collapse overhead, and stores content, vectors, and decaying
 * counters together inside the same document for atomic, in-place update scripting.
 */
export class MemoryServiceImpl implements MemoryService {
  private readonly esClient: ElasticsearchClient;
  private readonly historyStorage: ReturnType<typeof createMemoryHistoryStorage>;
  private readonly logger: Logger;

  constructor({ logger, esClient }: { logger: Logger; esClient: ElasticsearchClient }) {
    this.logger = logger;
    this.esClient = esClient;
    this.historyStorage = createMemoryHistoryStorage({ esClient });
  }

  // ── Write helpers ──

  private async _indexPage(entry: MemoryEntry): Promise<void> {
    const document = toStoredMemoryPage(entry);
    // Populate search_embedding for live pages so semantic/hybrid search can rank them.
    // In our Jina configuration, this semanticText field handles automatic vectorization under-the-hood.
    document.search_embedding = `${entry.title}\n\n${entry.content}`;

    await this.esClient.index({
      index: MEMORIES_DATA_STREAM,
      id: entry.id,
      document,
      refresh: 'wait_for',
    });
  }

  private async _getById(id: string): Promise<MemoryEntry | undefined> {
    try {
      const response = await this.esClient.get<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        id,
      });
      if (response.found && response._source) {
        return applyTelemetryDecayAndLabelling(toMemoryEntry(id, response._source));
      }
      return undefined;
    } catch (err) {
      if (isIndexNotFoundError(err) || (err as { statusCode?: number }).statusCode === 404) {
        return undefined;
      }
      throw err;
    }
  }

  private async _getByName(name: string): Promise<MemoryEntry | undefined> {
    try {
      const response = await this.esClient.search<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        query: { term: { 'attributes.name': name } },
        size: 1,
      });
      const hit = response.hits.hits[0];
      if (hit && hit._source) {
        return applyTelemetryDecayAndLabelling(toMemoryEntry(hit._id!, hit._source));
      }
      return undefined;
    } catch (err) {
      if (isIndexNotFoundError(err)) return undefined;
      throw err;
    }
  }

  // ── Public API ──

  async create(params: CreateMemoryParams): Promise<MemoryEntry> {
    const { name, title, content, categories = [], references = [], tags = [], user } = params;

    const existing = await this._getByName(name);
    if (existing) {
      throw badRequest(`Memory entry with name '${name}' already exists`);
    }

    const now = new Date().toISOString();
    const entry: MemoryEntry = {
      id: uuidV4(),
      name,
      title,
      content,
      categories,
      references,
      tags,
      created_at: now,
      updated_at: now,
      created_by: user,
      updated_by: user,
      space_id: 'default', // Defaults to global space-agnostic
      telemetry: {
        impressions: 0.0,
        conversions: 0.0,
        last_impression_time: now,
      },
    };

    await this._indexPage(entry);
    await this._writeHistory(entry, 'create', `Created entry "${name}"`, user);
    return entry;
  }

  async get({ id }: { id: string }): Promise<MemoryEntry> {
    const entry = await this._getById(id);
    if (!entry) throw notFound(`Memory entry with id '${id}' not found`);
    return entry;
  }

  async getByName({ name }: { name: string }): Promise<MemoryEntry | undefined> {
    return this._getByName(name);
  }

  async update(params: UpdateMemoryParams): Promise<MemoryEntry> {
    const { id, user, changeSummary } = params;
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    const newName = params.name;
    const isRename = newName !== undefined && newName !== current.name;
    if (isRename) {
      const existingWithName = await this._getByName(newName);
      if (existingWithName) {
        throw badRequest(`Memory entry with name '${newName}' already exists`);
      }
    }

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...current,
      ...(params.content !== undefined && { content: params.content }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.name !== undefined && { name: params.name }),
      ...(params.categories !== undefined && { categories: params.categories }),
      ...(params.references !== undefined && { references: params.references }),
      ...(params.tags !== undefined && { tags: params.tags }),
      updated_at: now,
      updated_by: user,
    };

    await this._indexPage(updated);

    const changeType: MemoryChangeType = isRename ? 'rename' : 'update';
    await this._writeHistory(
      updated,
      changeType,
      changeSummary ?? `Updated entry "${updated.name}"`,
      user
    );
    return updated;
  }

  async delete({ id, user }: { id: string; user: string }): Promise<void> {
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    await this.esClient.delete({
      index: MEMORIES_DATA_STREAM,
      id,
      refresh: 'wait_for',
    });

    // Create a history record for the delete
    const record: MemoryVersionRecord = {
      id: uuidV4(),
      entry_id: id,
      version: 0,
      name: current.name,
      title: current.title,
      content: current.content,
      tags: current.tags,
      categories: current.categories,
      change_type: 'delete',
      change_summary: `Deleted entry "${current.name}"`,
      created_at: new Date().toISOString(),
      created_by: user,
    };
    await this.historyStorage.getClient().index({ document: record });
  }

  // ── Categories ──

  async addCategory({
    id,
    category,
    user,
  }: {
    id: string;
    category: string;
    user: string;
  }): Promise<MemoryEntry> {
    return this._updateCategories({
      id,
      user,
      transform: (cats) => (cats.includes(category) ? null : [...cats, category]),
      changeSummary: `Added category "${category}"`,
    });
  }

  async removeCategory({
    id,
    category,
    user,
  }: {
    id: string;
    category: string;
    user: string;
  }): Promise<MemoryEntry> {
    return this._updateCategories({
      id,
      user,
      transform: (cats) => (cats.includes(category) ? cats.filter((c) => c !== category) : null),
      changeSummary: `Removed category "${category}"`,
    });
  }

  private async _updateCategories({
    id,
    user,
    transform,
    changeSummary,
  }: {
    id: string;
    user: string;
    transform: (categories: string[]) => string[] | null;
    changeSummary: string;
  }): Promise<MemoryEntry> {
    const current = await this._getById(id);
    if (!current) throw notFound(`Memory entry with id '${id}' not found`);

    const newCategories = transform(current.categories);
    if (newCategories === null) return current;

    const now = new Date().toISOString();
    const updated: MemoryEntry = {
      ...current,
      categories: newCategories,
      updated_at: now,
      updated_by: user,
    };
    await this._indexPage(updated);
    await this._writeHistory(updated, 'update', changeSummary, user);
    return updated;
  }

  async listCategories(): Promise<string[]> {
    const entries = await this.listAll();
    const categorySet = new Set<string>();
    for (const entry of entries) {
      for (const cat of entry.categories) categorySet.add(cat);
    }
    return Array.from(categorySet).sort();
  }

  async getCategoryTree(): Promise<{
    tree: MemoryCategoryNode[];
    uncategorized: Array<{ id: string; name: string; title: string }>;
  }> {
    const all = await this.listAll();
    return {
      tree: buildCategoryTree(all),
      uncategorized: all
        .filter((e) => e.categories.length === 0)
        .map((e) => ({ id: e.id, name: e.name, title: e.title })),
    };
  }

  // ── References ──

  async getBacklinks({ id }: { id: string }): Promise<MemoryEntry[]> {
    try {
      const response = await this.esClient.search<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        query: { term: { 'attributes.references': id } },
        size: MAX_PAGES,
      });
      return response.hits.hits.flatMap((hit) => {
        if (!hit._source) return [];
        const entry = applyTelemetryDecayAndLabelling(toMemoryEntry(hit._id!, hit._source));
        return entry.references.includes(id) ? [entry] : [];
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  // ── Search & browse ──

  async search(params: SearchMemoryParams): Promise<MemorySearchResult[]> {
    const { query, tags, categories, references, size = 10 } = params;
    const mode = resolveSearchMode(params.mode);
    const escapedQuery = query.toLowerCase().replace(/[\\*?]/g, '\\$&');

    const structuredFilters: QueryDslQueryContainer[] = [];
    if (tags?.length) structuredFilters.push({ terms: { tags } });
    if (categories?.length) structuredFilters.push({ terms: { 'attributes.categories': categories } });
    if (references?.length) structuredFilters.push({ terms: { 'attributes.references': references } });

    const fuzzyMatch: QueryDslQueryContainer = {
      bool: {
        should: [
          {
            multi_match: {
              query,
              fields: ['title^3', 'content'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          },
          { wildcard: { 'attributes.name': { value: `*${escapedQuery}*`, boost: 2 } } },
          { wildcard: { 'attributes.categories': { value: `*${escapedQuery}*`, boost: 2 } } },
          { wildcard: { tags: { value: `*${escapedQuery}*`, boost: 2 } } },
        ],
        minimum_should_match: 1,
      },
    };

    const response = await this._executePhase3(
      mode,
      params.mode,
      query,
      structuredFilters,
      fuzzyMatch,
      size
    );
    if (!response) return [];

    return response.hits.hits.flatMap((hit) => {
      const source = hit._source;
      if (!source) return [];
      const entry = applyTelemetryDecayAndLabelling(toMemoryEntry(hit._id!, source));
      return [
        {
          id: entry.id,
          name: entry.name,
          title: entry.title,
          snippet: hit.highlight?.content?.[0] ?? entry.content.substring(0, 200),
          score: hit._score ?? 0,
          updated_at: entry.updated_at,
          updated_by: entry.updated_by,
          tags: entry.tags,
          categories: entry.categories,
        },
      ];
    });
  }

  private async _executePhase3(
    mode: SearchMode,
    requestedMode: SearchMode | undefined,
    query: string,
    structuredFilters: QueryDslQueryContainer[],
    fuzzyMatch: QueryDslQueryContainer,
    size: number
  ) {
    const { semantic_min_score: minScore, rrf_rank_constant: rankConstant } =
      DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG;

    let retriever: RetrieverContainer | undefined;

    // Advanced, unified hybrid RRF search retriever combining BM25 keyword matching
    // and Jina semantic vector search (Painless script score), wrapped in Jina Reranker.
    if (mode === 'semantic') {
      retriever = {
        linear: {
          retrievers: [
            {
              retriever: {
                standard: {
                  query: {
                    script_score: {
                      query: { match: { search_embedding: query } },
                      script: {
                        source: "double now = params.now; double lastTime = doc['attributes.telemetry.last_impression_time'].size() > 0 ? doc['attributes.telemetry.last_impression_time'].value.toInstant().toEpochMilli() : now; double timeDiffSec = (now - lastTime) / 1000.0; double decay = Math.exp(-params.decay_lambda * timeDiffSec); double imp = doc['attributes.telemetry.impressions'].size() > 0 ? doc['attributes.telemetry.impressions'].value : 0.0; double conv = doc['attributes.telemetry.conversions'].size() > 0 ? doc['attributes.telemetry.conversions'].value : 0.0; double decayedImp = imp * decay; double decayedConv = conv * decay; double useful = decayedImp > 0.0 ? (decayedConv / decayedImp) : 0.0; return _score * (1.0 + useful);",
                        params: {
                          now: Date.now(),
                          decay_lambda: DECAY_LAMBDA,
                        },
                      },
                    },
                  },
                  filter: { bool: { filter: structuredFilters } },
                },
              },
              weight: 1,
              normalizer: 'minmax',
            },
          ],
          rank_window_size: size,
          min_score: minScore,
        },
      };
    } else if (mode === 'hybrid') {
      retriever = {
        text_similarity_reranker: {
          retriever: {
            rrf: {
              retrievers: [
                {
                  standard: {
                    query: { bool: { must: [fuzzyMatch], filter: structuredFilters } },
                  },
                },
                {
                  linear: {
                    retrievers: [
                      {
                        retriever: {
                          standard: {
                            query: {
                              script_score: {
                                query: { match: { search_embedding: query } },
                                script: {
                                  source: "double now = params.now; double lastTime = doc['attributes.telemetry.last_impression_time'].size() > 0 ? doc['attributes.telemetry.last_impression_time'].value.toInstant().toEpochMilli() : now; double timeDiffSec = (now - lastTime) / 1000.0; double decay = Math.exp(-params.decay_lambda * timeDiffSec); double imp = doc['attributes.telemetry.impressions'].size() > 0 ? doc['attributes.telemetry.impressions'].value : 0.0; double conv = doc['attributes.telemetry.conversions'].size() > 0 ? doc['attributes.telemetry.conversions'].value : 0.0; double decayedImp = imp * decay; double decayedConv = conv * decay; double useful = decayedImp > 0.0 ? (decayedConv / decayedImp) : 0.0; return _score * (1.0 + useful);",
                                  params: {
                                    now: Date.now(),
                                    decay_lambda: DECAY_LAMBDA,
                                  },
                                },
                              },
                            },
                          },
                        },
                        weight: 1,
                        normalizer: 'minmax',
                      },
                    ],
                    rank_window_size: size,
                    min_score: minScore,
                  },
                },
              ],
              filter: { bool: { filter: structuredFilters } },
              rank_window_size: size,
              rank_constant: rankConstant,
            },
          },
          field: 'content',
          inference_id: 'jina-reranker',
          inference_text: query,
        },
      };
    }

    try {
      if (retriever) {
        return await this.esClient.search<StoredMemoryPage>({
          index: MEMORIES_DATA_STREAM,
          track_total_hits: false,
          retriever,
          size,
          highlight: {
            fields: { content: { fragment_size: 200, number_of_fragments: 1 }, title: {} },
          },
        });
      }

      // keyword mode: plain bool query, no retriever
      return await this.esClient.search<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: false,
        query: { bool: { filter: structuredFilters, must: [fuzzyMatch] } },
        sort: [{ _score: { order: 'desc' } }],
        size,
        highlight: {
          fields: { content: { fragment_size: 200, number_of_fragments: 1 }, title: {} },
        },
      });
    } catch (err) {
      if (mode !== 'keyword' && !requestedMode) {
        // Auto-resolved mode failed (inference endpoint unavailable) — fall back to keyword.
        this.logger.warn(
          `Memory search mode "${mode}" failed, falling back to keyword: ${(err as Error).message}`
        );
        return this.esClient.search<StoredMemoryPage>({
          index: MEMORIES_DATA_STREAM,
          track_total_hits: false,
          query: { bool: { filter: structuredFilters, must: [fuzzyMatch] } },
          sort: [{ _score: { order: 'desc' } }],
          size,
          highlight: {
            fields: { content: { fragment_size: 200, number_of_fragments: 1 }, title: {} },
          },
        });
      }
      if (isIndexNotFoundError(err)) return null;
      throw err;
    }
  }

  async listAll(): Promise<MemoryEntry[]> {
    try {
      const response = await this.esClient.search<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        track_total_hits: false,
        query: { match_all: {} },
        size: MAX_PAGES,
      });

      const hits = response.hits.hits;
      const entries = hits.flatMap((hit) => {
        if (!hit._source) return [];
        return [applyTelemetryDecayAndLabelling(toMemoryEntry(hit._id!, hit._source))];
      });

      if (hits.length === MAX_PAGES) {
        this.logger.warn(
          `Memory listAll: hit the ${MAX_PAGES}-page fetch limit (${entries.length} pages); pages beyond the limit are not returned`
        );
      }

      // For Live Browse Mode (Greedy Thompson Sampling re-ranking):
      // If we are listing pages, sort them dynamically based on Thompson intervals in Node.js
      return entries.sort((left, right) => {
        const scoreLeft = (left.labels?.useful ?? 0) * (left.labels?.confidence ?? 0);
        const scoreRight = (right.labels?.useful ?? 0) * (right.labels?.confidence ?? 0);
        return scoreRight - scoreLeft;
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  async listByCategory({ category }: { category: string }): Promise<MemoryEntry[]> {
    try {
      const response = await this.esClient.search<StoredMemoryPage>({
        index: MEMORIES_DATA_STREAM,
        query: { term: { 'attributes.categories': category } },
        size: MAX_PAGES,
      });
      return response.hits.hits.flatMap((hit) => {
        if (!hit._source) return [];
        const entry = applyTelemetryDecayAndLabelling(toMemoryEntry(hit._id!, hit._source));
        return entry.categories.includes(category) ? [entry] : [];
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  // ── History ──

  async getHistory({
    entryId,
    size = 50,
  }: {
    entryId: string;
    size?: number;
  }): Promise<MemoryVersionRecord[]> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { bool: { filter: [{ term: { entry_id: entryId } }] } },
        size,
        sort: [{ version: { order: 'desc' } }],
      });
      return response.hits.hits.map((h) => h._source);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  async getVersion({
    entryId,
    version,
  }: {
    entryId: string;
    version: number;
  }): Promise<MemoryVersionRecord> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { bool: { filter: [{ term: { entry_id: entryId } }, { term: { version } }] } },
        size: 1,
        terminate_after: 1,
      });
      if (response.hits.hits.length === 0) {
        throw notFound(`Version ${version} not found for entry '${entryId}'`);
      }
      return response.hits.hits[0]._source;
    } catch (err) {
      if (isIndexNotFoundError(err)) {
        throw notFound(`Version ${version} not found for entry '${entryId}'`);
      }
      throw err;
    }
  }

  async getRecentChanges({ size = 20 }: { size?: number } = {}): Promise<MemoryVersionRecord[]> {
    try {
      const response = await this.historyStorage.getClient().search({
        track_total_hits: false,
        query: { match_all: {} },
        size,
        sort: [{ created_at: { order: 'desc' } }],
      });
      return response.hits.hits.map((h) => h._source);
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  }

  // ── Private helpers ──

  private async _writeHistory(
    entry: MemoryEntry,
    changeType: MemoryChangeType,
    changeSummary: string,
    user: string
  ): Promise<void> {
    const record: MemoryVersionRecord = {
      id: uuidV4(),
      entry_id: entry.id,
      version: 0, // Legacy version is constant 0 since we have direct standard index overwrites
      name: entry.name,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      categories: entry.categories,
      change_type: changeType,
      change_summary: changeSummary,
      created_at: entry.updated_at,
      created_by: user,
    };
    await this.historyStorage.getClient().index({ document: record });
  }
}

/**
 * Build a category tree from all memory entries.
 * Categories use "/" as separator for hierarchy (e.g. "streams/logs-otel").
 */
const buildCategoryTree = (entries: MemoryEntry[]): MemoryCategoryNode[] => {
  const nodeMap = new Map<string, MemoryCategoryNode>();

  const getOrCreateNode = (category: string): MemoryCategoryNode => {
    const existing = nodeMap.get(category);
    if (existing) return existing;

    const parts = category.split('/');
    const node: MemoryCategoryNode = {
      name: parts[parts.length - 1],
      category,
      pages: [],
      children: [],
    };
    nodeMap.set(category, node);

    if (parts.length > 1) {
      const parentCategory = parts.slice(0, -1).join('/');
      const parent = getOrCreateNode(parentCategory);
      if (!parent.children.some((c) => c.category === category)) {
        parent.children.push(node);
      }
    }
    return node;
  };

  for (const entry of entries) {
    for (const category of entry.categories) {
      const node = getOrCreateNode(category);
      node.pages.push({ id: entry.id, name: entry.name, title: entry.title });
    }
  }

  const roots: MemoryCategoryNode[] = [];
  for (const [category, node] of nodeMap) {
    if (!category.includes('/')) roots.push(node);
  }

  const sortNodes = (nodes: MemoryCategoryNode[]) => {
    nodes.sort((a, b) => a.category.localeCompare(b.category));
    for (const node of nodes) {
      node.pages.sort((a, b) => a.name.localeCompare(b.name));
      sortNodes(node.children);
    }
  };
  sortNodes(roots);
  return roots;
};
