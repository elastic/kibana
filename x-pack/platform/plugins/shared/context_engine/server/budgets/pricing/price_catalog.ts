/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

/** USD per one million tokens. */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead?: number;
}

export interface PriceSnapshot {
  /** Keyed by model slug, e.g. `anthropic-claude-4-5-haiku`. */
  prices: ReadonlyMap<string, ModelPrice>;
  fetchedAt: string;
  stale: boolean;
}

export interface PriceCatalog {
  getPrices: () => Promise<PriceSnapshot | undefined>;
}

export type PriceCatalogFetch = (
  url: string,
  init: { signal: AbortSignal }
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  text: () => Promise<string>;
}>;

const PRICE_CATALOG_PATH = '/api/v1/prices/base_prices';
const TOKEN_UNIT = '1M Token';
/** `global.inference-chat-input_anthropic-claude-4-5-haiku`, optionally with a `_<tier>` suffix. */
const CHAT_PRICE_ID_PATTERN =
  /^global\.inference-chat-(input|output|cache-read)_([a-z0-9-]+?)(?:_[a-z0-9+-]+)?$/;

type PriceOperation = 'input' | 'output' | 'cache-read';

interface CatalogRow {
  slug: string;
  operation: PriceOperation;
  amount: number;
  startMs: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Tiered models list a price per prompt-size tier; budgets price every call at the
 * lower (`<=`) tier, since Context Engine prompts stay well under the tier boundaries.
 */
const isUpperTier = (tokenTier: unknown): boolean =>
  typeof tokenTier === 'string' && tokenTier.trim().startsWith('>');

const parseRow = (row: unknown, nowMs: number): CatalogRow | undefined => {
  if (!isRecord(row) || row.product_type !== 'inference' || typeof row.id !== 'string') {
    return undefined;
  }
  const match = CHAT_PRICE_ID_PATTERN.exec(row.id);
  if (!match || row.unit !== TOKEN_UNIT || isUpperTier(row.token_tier)) {
    return undefined;
  }
  const amount = row.unit_amount;
  const startMs = typeof row.start === 'string' ? Date.parse(row.start) : NaN;
  const endMs = typeof row.end === 'string' ? Date.parse(row.end) : undefined;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return undefined;
  }
  if (Number.isNaN(startMs) || startMs > nowMs || (endMs !== undefined && endMs <= nowMs)) {
    return undefined;
  }
  return { slug: match[2], operation: match[1] as PriceOperation, amount, startMs };
};

/** Builds the price map from the raw catalog, keeping the latest effective price per operation. */
export const parsePriceCatalog = (payload: unknown, now: Date): Map<string, ModelPrice> => {
  if (!Array.isArray(payload)) {
    throw new Error('Price catalog response is not an array');
  }
  const latest = new Map<string, CatalogRow>();
  for (const raw of payload) {
    const row = parseRow(raw, now.getTime());
    if (!row) {
      continue;
    }
    const key = `${row.slug}|${row.operation}`;
    const current = latest.get(key);
    if (!current || row.startMs > current.startMs) {
      latest.set(key, row);
    }
  }

  const prices = new Map<string, ModelPrice>();
  const slugs = new Set([...latest.values()].map(({ slug }) => slug));
  for (const slug of slugs) {
    const input = latest.get(`${slug}|input`);
    const output = latest.get(`${slug}|output`);
    if (!input || !output) {
      continue;
    }
    const cacheRead = latest.get(`${slug}|cache-read`);
    prices.set(slug, {
      input: input.amount,
      output: output.amount,
      ...(cacheRead && { cacheRead: cacheRead.amount }),
    });
  }
  return prices;
};

/**
 * Reads Elastic's public price catalog, which lists the list price of every model served by
 * the Elastic Inference Service. Results are cached; on refresh failure the last good copy
 * is served as `stale`, and with no copy at all callers fall back to token-only reporting.
 */
export const createPriceCatalog = ({
  fetchFn,
  baseUrl,
  logger,
  getNow = () => new Date(),
  cacheTtlMs = 6 * 60 * 60 * 1000,
  timeoutMs = 10_000,
  maxBodyBytes = 20 * 1024 * 1024,
}: {
  fetchFn: PriceCatalogFetch;
  baseUrl: string;
  logger: Logger;
  getNow?: () => Date;
  cacheTtlMs?: number;
  timeoutMs?: number;
  maxBodyBytes?: number;
}): PriceCatalog => {
  const url = `${baseUrl.replace(/\/+$/, '')}${PRICE_CATALOG_PATH}`;
  let cache: { snapshot: PriceSnapshot; fetchedAtMs: number } | undefined;
  let inFlight: Promise<PriceSnapshot | undefined> | undefined;

  const refresh = async (): Promise<PriceSnapshot | undefined> => {
    const now = getNow();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }
      const contentLength = Number(response.headers.get('content-length') ?? 0);
      if (contentLength > maxBodyBytes) {
        throw new Error('response exceeds the size limit');
      }
      const body = await response.text();
      if (body.length > maxBodyBytes) {
        throw new Error('response exceeds the size limit');
      }
      const prices = parsePriceCatalog(JSON.parse(body), now);
      if (prices.size === 0) {
        throw new Error('catalog contained no chat completion prices');
      }
      const snapshot: PriceSnapshot = { prices, fetchedAt: now.toISOString(), stale: false };
      cache = { snapshot, fetchedAtMs: now.getTime() };
      return snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (cache) {
        logger.warn(
          `Failed to refresh the inference price catalog, using the last copy: ${message}`
        );
        return { ...cache.snapshot, stale: true };
      }
      logger.warn(`Inference price catalog unavailable, reporting tokens only: ${message}`);
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getPrices: async () => {
      if (cache && getNow().getTime() - cache.fetchedAtMs < cacheTtlMs) {
        return cache.snapshot;
      }
      if (!inFlight) {
        inFlight = refresh().finally(() => {
          inFlight = undefined;
        });
      }
      return inFlight;
    },
  };
};
