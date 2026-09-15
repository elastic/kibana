/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  MEMORY_AI_INDEX_DEST,
  type StoredMemoryPage,
  type StoredMemoryStatus,
  type MemoryPage,
  type MemoryStats,
} from '../../common/memory';

const MAX_LIST_SIZE = 500;
const MEMORY_TAG = 'memory';
const SPACE_ID_FIELD = 'attributes.space_id';

const HALF_LIFE_SEC = 7 * 24 * 3600;
const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_SEC;

export interface MemoryPageStore {
  list: (options?: { status?: StoredMemoryStatus }) => Promise<{
    pages: MemoryPage[];
    stats: MemoryStats;
  }>;
  get: (id: string) => Promise<MemoryPage | undefined>;
  getByName: (name: string) => Promise<MemoryPage | undefined>;
  upsert: (page: {
    slug: string;
    title: string;
    description?: string;
    content: string;
    tags: string[];
    categories: string[];
    references: string[];
    status: StoredMemoryStatus;
    telemetry?: {
      impressions: number;
      conversions: number;
      last_impression_time: string;
    };
    user: string;
  }) => Promise<MemoryPage>;
  corroborate: (id: string) => Promise<MemoryPage | undefined>;
  archive: (id: string) => Promise<MemoryPage | undefined>;
  delete: (id: string) => Promise<void>;
  pruneDuplicates: () => Promise<number>;
}

const normalizeSlugText = (slug: string): string =>
  slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const canonicalizeSlug = (slug: string): string => {
  let normalized = normalizeSlugText(slug);
  if (normalized.startsWith('memory-')) {
    normalized = normalized.slice('memory-'.length);
  }
  return normalized.replace(/^-+|-+$/g, '').slice(0, 80);
};

export const toMemoryKiId = (slug: string): string => {
  const normalizedSlug = canonicalizeSlug(slug);
  return `memory_${normalizedSlug}`.slice(0, 512);
};

export const slugFromMemoryId = (id: string): string => {
  const prefix = `memory_`;
  if (id.startsWith(prefix)) {
    return id.slice(prefix.length);
  }
  return id;
};

const calculateConfidence = (imp: number, conv: number): number => {
  if (imp <= 0) return 0;
  return Math.min(1, imp / 50.0);
};

const applyTelemetryDecayAndLabelling = (page: MemoryPage, nowMs: number = Date.now()): MemoryPage => {
  const tel = page.telemetry;
  const lastTime = new Date(tel.last_impression_time).getTime();
  const timeDiffSec = Math.max(0, (nowMs - lastTime) / 1000.0);
  const decayFactor = Math.exp(-DECAY_LAMBDA * timeDiffSec);

  const decayedImp = tel.impressions * decayFactor;
  const decayedConv = tel.conversions * decayFactor;

  const useful = decayedImp > 0 ? (decayedConv / decayedImp) : 0;
  const confidence = calculateConfidence(decayedImp, decayedConv);

  return {
    ...page,
    telemetry: {
      impressions: decayedImp,
      conversions: decayedConv,
      last_impression_time: new Date(nowMs).toISOString(),
    },
  };
};

const toPage = (id: string, source: StoredMemoryPage): MemoryPage | undefined => {
  if (source.title === undefined || source.title.length === 0) {
    return undefined;
  }

  const slug = source.attributes?.slug ?? slugFromMemoryId(id);
  const status = source.attributes?.status ?? 'tentative';

  return {
    id,
    slug,
    title: source.title,
    description: source.description,
    content: source.content ?? '',
    tags: source.tags ?? [],
    status,
    space_id: source.attributes?.space_id ?? 'default',
    categories: source.attributes?.categories ?? [],
    references: source.attributes?.references ?? [],
    created_at: source.attributes?.created_at ?? source['@timestamp'] ?? new Date().toISOString(),
    updated_at: source.attributes?.updated_at ?? source['@timestamp'] ?? new Date().toISOString(),
    created_by: source.attributes?.created_by ?? '',
    updated_by: source.attributes?.updated_by ?? '',
    telemetry: {
      impressions: Number(source.attributes?.impressions ?? 0.0),
      conversions: Number(source.attributes?.conversions ?? 0.0),
      last_impression_time: source.attributes?.last_impression_time ?? new Date().toISOString(),
    },
  };
};

export const createMemoryPageStore = ({
  esClient,
  logger,
  spaceId,
  signal,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  signal?: AbortSignal;
}): MemoryPageStore => {
  const isIndexNotFoundError = (err: unknown): boolean => {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404) return true;
    const message = err instanceof Error ? err.message : String(err);
    return message.includes('index_not_found_exception');
  };

  const toStoredId = (pageId: string): string => `${spaceId}:${pageId}`;
  const toPageId = (storedId: string): string =>
    storedId.startsWith(`${spaceId}:`) ? storedId.slice(spaceId.length + 1) : storedId;

  const listAll = async (): Promise<MemoryPage[]> => {
    try {
      const response = await esClient.search<StoredMemoryPage>({
        index: MEMORY_AI_INDEX_DEST,
        query: {
          bool: {
            filter: [
              { term: { tags: MEMORY_TAG } },
              { term: { [SPACE_ID_FIELD]: spaceId } }
            ],
          },
        },
        size: MAX_LIST_SIZE,
        sort: [{ '@timestamp': { order: 'desc' } }],
        signal,
      });

      return response.hits.hits.flatMap((hit) => {
        if (!hit._id || !hit._source) return [];
        const page = toPage(toPageId(hit._id), hit._source);
        return page ? [applyTelemetryDecayAndLabelling(page)] : [];
      });
    } catch (err) {
      if (isIndexNotFoundError(err)) return [];
      throw err;
    }
  };

  return {
    async list({ status } = {}) {
      const allPages = await listAll();
      const filtered = allPages.filter((page) => {
        if (status !== undefined && page.status !== status) {
          return false;
        }
        return true;
      });

      // Compute statistics over filtered set
      let decayed_impressions = 0;
      let decayed_conversions = 0;
      for (const p of filtered) {
        decayed_impressions += p.telemetry.impressions;
        decayed_conversions += p.telemetry.conversions;
      }

      return {
        pages: filtered,
        stats: {
          total: filtered.length,
          decayed_impressions,
          decayed_conversions,
        },
      };
    },

    async get(id) {
      const storedId = toStoredId(id);
      try {
        const response = await esClient.get<StoredMemoryPage>({
          index: MEMORY_AI_INDEX_DEST,
          id: storedId,
          signal,
        });
        if (response.found && response._source) {
          const page = toPage(id, response._source);
          return page ? applyTelemetryDecayAndLabelling(page) : undefined;
        }
        return undefined;
      } catch (err) {
        if (isIndexNotFoundError(err) || (err as { statusCode?: number }).statusCode === 404) {
          return undefined;
        }
        throw err;
      }
    },

    async getByName(name) {
      const slug = canonicalizeSlug(name);
      return this.get(toMemoryKiId(slug));
    },

    async upsert(page) {
      const id = toMemoryKiId(page.slug);
      const storedId = toStoredId(id);

      const existing = await this.get(id);
      const now = new Date().toISOString();

      const document: StoredMemoryPage = {
        '@timestamp': now,
        type: 'memory',
        title: page.title,
        description: page.description,
        content: page.content,
        tags: [MEMORY_TAG, ...page.tags],
        search_embedding: `${page.title}\n\n${page.content}`,
        attributes: {
          status: page.status,
          slug: page.slug,
          space_id: spaceId,
          categories: page.categories,
          references: page.references,
          created_at: existing?.created_at ?? now,
          updated_at: now,
          created_by: existing?.created_by ?? page.user,
          updated_by: page.user,
          impressions: page.telemetry?.impressions ?? existing?.telemetry.impressions ?? 0.0,
          conversions: page.telemetry?.conversions ?? existing?.telemetry.conversions ?? 0.0,
          last_impression_time: page.telemetry?.last_impression_time ?? existing?.telemetry.last_impression_time ?? now,
        },
      };

      await esClient.index({
        index: MEMORY_AI_INDEX_DEST,
        id: storedId,
        document,
        refresh: 'wait_for',
        signal,
      });

      const updated = toPage(id, document);
      if (!updated) {
        throw new Error(`Failed to map standard index response to MemoryPage for ${id}`);
      }
      return applyTelemetryDecayAndLabelling(updated);
    },

    async corroborate(id) {
      const existing = await this.get(id);
      if (!existing || existing.status === 'archived') {
        return undefined;
      }

      const updated = await this.upsert({
        slug: existing.slug,
        title: existing.title,
        description: existing.description,
        content: existing.content,
        tags: existing.tags,
        categories: existing.categories,
        references: existing.references,
        status: existing.status,
        telemetry: {
          impressions: existing.telemetry.impressions,
          conversions: existing.telemetry.conversions + 1.0, // Conversions boost on corroboration
          last_impression_time: new Date().toISOString(),
        },
        user: existing.updated_by,
      });
      return updated;
    },

    async archive(id) {
      const existing = await this.get(id);
      if (!existing || existing.status === 'archived') {
        return undefined;
      }

      const updated = await this.upsert({
        slug: existing.slug,
        title: existing.title,
        description: existing.description,
        content: existing.content,
        tags: existing.tags,
        categories: existing.categories,
        references: existing.references,
        status: 'archived',
        user: existing.updated_by,
      });
      return updated;
    },

    async delete(id) {
      const storedId = toStoredId(id);
      try {
        await esClient.delete({
          index: MEMORY_AI_INDEX_DEST,
          id: storedId,
          refresh: 'wait_for',
          signal,
        });
      } catch (err) {
        if (!isIndexNotFoundError(err) && (err as { statusCode?: number }).statusCode !== 404) {
          throw err;
        }
      }
    },

    async pruneDuplicates() {
      // Direct standard index stores carry exactly one document per space-scoped ID,
      // meaning duplicates are mathematically impossible! Returns 0 pruned.
      return 0;
    },
  };
};
