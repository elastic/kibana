/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';

const DEFAULT_CLOUD_BASE_URL = 'https://cloud.elastic.co';
const BASE_PRICES_PATH = '/api/v1/prices/base_prices';
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60_000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_RETRY_BACKOFF_MS = 30_000;
const MAX_RETRY_BACKOFF_MS = 30 * 60_000;
const MAX_PRICE_ROWS = 10_000;
const PRICE_UNIT = '1M Token';

const basePriceRowSchema = schema.object(
  {
    id: schema.string({ maxLength: 512 }),
    name: schema.string({ maxLength: 512 }),
    product_type: schema.string({ maxLength: 128 }),
    start: schema.string({ maxLength: 64 }),
    end: schema.nullable(schema.string({ maxLength: 64 })),
    unit: schema.nullable(schema.string({ maxLength: 64 })),
    unit_amount: schema.nullable(schema.number({ min: 0 })),
    token_tier: schema.nullable(schema.string({ maxLength: 64 })),
    currency: schema.maybe(schema.nullable(schema.string({ maxLength: 16 }))),
  },
  { unknowns: 'allow' }
);

const basePriceResponseSchema = schema.arrayOf(basePriceRowSchema, {
  maxSize: MAX_PRICE_ROWS,
});

type BasePriceRow = TypeOf<typeof basePriceRowSchema>;

export type InferencePriceOperation =
  | 'input'
  | 'output'
  | 'cache_read'
  | 'cache_write_5m'
  | 'cache_write_1h';

export interface PromptPriceTier {
  raw: string | null;
  threshold: number | null;
  direction: 'flat' | 'up_to' | 'above';
}

export interface InferencePrice {
  modelId: string;
  operation: InferencePriceOperation;
  promptTier: PromptPriceTier;
  unitAmount: number;
  unit: typeof PRICE_UNIT;
}

export interface ParsedPriceCatalog {
  pricesByModel: ReadonlyMap<string, readonly InferencePrice[]>;
  effectiveAt: string;
  currency: {
    code: 'USD' | null;
    symbol: '$' | null;
    assumed: boolean;
    unit: typeof PRICE_UNIT;
  };
}

export interface PriceServiceResult {
  catalog: ParsedPriceCatalog;
  fetchedAt: string;
  stale: boolean;
}

type PriceServiceLogger = Pick<Logger, 'error' | 'warn'>;

interface ParsedRow {
  scope: string;
  price: InferencePrice;
}

interface PriceFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: {
    get(name: string): string | null;
  };
  body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
}

type PriceFetch = (url: string, options: { signal: AbortSignal }) => Promise<PriceFetchResponse>;

export interface PriceServiceOptions {
  logger: PriceServiceLogger;
  cloudBaseUrl?: string;
  fetch?: PriceFetch;
  now?: () => number;
  cacheTtlMs?: number;
  fetchTimeoutMs?: number;
  maxResponseBytes?: number;
  retryBackoffMs?: number;
}

const parsePriceIdentity = (
  id: string
): { scope: string; operation: InferencePriceOperation } | undefined => {
  const match = id.match(
    /^(?<scope>.+)-chat-(?<operation>cache-write-5m|cache-write-1h|cache-read|input|output)_/
  );
  if (!match?.groups) {
    return undefined;
  }
  const operations: Record<string, InferencePriceOperation> = {
    input: 'input',
    output: 'output',
    'cache-read': 'cache_read',
    'cache-write-5m': 'cache_write_5m',
    'cache-write-1h': 'cache_write_1h',
  };
  return {
    scope: match.groups.scope,
    operation: operations[match.groups.operation],
  };
};

export const normalizeInferenceModelName = (name: string): string => {
  const [modelName] = name.split(/\s+-\s+chat completion\s+-\s+/i);
  if (modelName === name) {
    throw new Error(`Cannot derive an inference model id from price name "${name}"`);
  }
  return modelName.trim().toLowerCase().replace(/\s+/g, '-');
};

const parsePromptTier = (tokenTier: string | null): PromptPriceTier => {
  if (tokenTier === null) {
    return { raw: null, threshold: null, direction: 'flat' };
  }
  const normalized = tokenTier.trim().toLowerCase();
  const match = normalized.match(/^(<=|>)(\d+)k$/);
  if (!match) {
    throw new Error(`Unsupported inference token tier "${tokenTier}"`);
  }
  return {
    raw: normalized,
    threshold: Number(match[2]) * 1000,
    direction: match[1] === '<=' ? 'up_to' : 'above',
  };
};

const parseDate = (value: string, field: 'start' | 'end'): number => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid inference price ${field} date "${value}"`);
  }
  return timestamp;
};

const isEffective = (row: BasePriceRow, effectiveAt: number): boolean => {
  const start = parseDate(row.start, 'start');
  const end = row.end === null ? undefined : parseDate(row.end, 'end');
  return start <= effectiveAt && (end === undefined || effectiveAt < end);
};

const priceKey = ({ modelId, operation, promptTier }: InferencePrice): string =>
  `${modelId}:${operation}:${promptTier.direction}:${promptTier.threshold ?? 'flat'}`;

const parseRow = (row: BasePriceRow): ParsedRow | undefined => {
  if (row.product_type !== 'inference') {
    return undefined;
  }
  const identity = parsePriceIdentity(row.id);
  if (!identity) {
    return undefined;
  }
  if (row.unit !== PRICE_UNIT) {
    throw new Error(`Unsupported inference price unit "${row.unit}" for "${row.id}"`);
  }
  if (row.unit_amount === null) {
    throw new Error(`Inference price "${row.id}" has no unit amount`);
  }
  return {
    scope: identity.scope,
    price: {
      modelId: normalizeInferenceModelName(row.name),
      operation: identity.operation,
      promptTier: parsePromptTier(row.token_tier),
      unitAmount: row.unit_amount,
      unit: PRICE_UNIT,
    },
  };
};

const resolveCurrency = (
  rows: BasePriceRow[],
  logger: PriceServiceLogger
): ParsedPriceCatalog['currency'] => {
  const explicitCurrencies = new Set(
    rows
      .map(({ currency }) => currency?.trim().toUpperCase())
      .filter((currency): currency is string => Boolean(currency))
  );
  if ([...explicitCurrencies].some((currency) => currency !== 'USD')) {
    logger.error(
      `Inference price response contains unsupported currency values: ${[
        ...explicitCurrencies,
      ].join(', ')}. Dollar rendering is disabled.`
    );
    return { code: null, symbol: null, assumed: false, unit: PRICE_UNIT };
  }
  return {
    code: 'USD',
    symbol: '$',
    assumed: explicitCurrencies.size === 0,
    unit: PRICE_UNIT,
  };
};

export const parseInferencePrices = ({
  response,
  effectiveAt,
  logger,
}: {
  response: unknown;
  effectiveAt: Date;
  logger: PriceServiceLogger;
}): ParsedPriceCatalog => {
  const rows = basePriceResponseSchema.validate(response);
  const effectiveAtMs = effectiveAt.getTime();
  if (Number.isNaN(effectiveAtMs)) {
    throw new Error('Cannot parse inference prices for an invalid effective date');
  }
  const effectiveRows = rows.filter((row) => isEffective(row, effectiveAtMs));
  const parsedRows = effectiveRows
    .map(parseRow)
    .filter((row): row is ParsedRow => row !== undefined);
  const globalRows = parsedRows.filter(({ scope }) => scope === 'global.inference');
  const globalPricesByKey = new Map<string, InferencePrice>();

  for (const { price } of globalRows) {
    const key = priceKey(price);
    if (globalPricesByKey.has(key)) {
      throw new Error(`Ambiguous active inference prices for "${key}"`);
    }
    globalPricesByKey.set(key, price);
  }

  for (const { scope, price } of parsedRows) {
    if (scope === 'global.inference') {
      continue;
    }
    const globalPrice = globalPricesByKey.get(priceKey(price));
    if (!globalPrice || globalPrice.unitAmount !== price.unitAmount) {
      logger.warn(
        `Inference price for "${priceKey(price)}" diverges between global.inference and ${scope}`
      );
    }
  }

  const pricesByModel = new Map<string, InferencePrice[]>();
  for (const price of globalPricesByKey.values()) {
    const modelPrices = pricesByModel.get(price.modelId) ?? [];
    modelPrices.push(price);
    pricesByModel.set(price.modelId, modelPrices);
  }

  return {
    pricesByModel,
    effectiveAt: effectiveAt.toISOString(),
    currency: resolveCurrency(effectiveRows, logger),
  };
};

const readLimitedResponseText = async (
  response: PriceFetchResponse,
  maxResponseBytes: number
): Promise<string> => {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxResponseBytes) {
      throw new Error(
        `Inference price response exceeds ${maxResponseBytes} bytes (${parsedLength} declared)`
      );
    }
  }
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxResponseBytes) {
      throw new Error(`Inference price response exceeds ${maxResponseBytes} bytes`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) {
        await reader.cancel();
        throw new Error(`Inference price response exceeds ${maxResponseBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class InferencePriceService {
  private readonly logger: PriceServiceLogger;
  private readonly url: string;
  private readonly fetch: PriceFetch;
  private readonly now: () => number;
  private readonly cacheTtlMs: number;
  private readonly fetchTimeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly retryBackoffMs: number;
  private cached?: { catalog: ParsedPriceCatalog; fetchedAtMs: number };
  private refreshPromise?: Promise<PriceServiceResult>;
  private retryAfterMs = 0;
  private consecutiveFailures = 0;
  private lastError?: Error;

  constructor({
    logger,
    cloudBaseUrl = DEFAULT_CLOUD_BASE_URL,
    fetch: fetchOverride,
    now = Date.now,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    maxResponseBytes = DEFAULT_MAX_RESPONSE_BYTES,
    retryBackoffMs = DEFAULT_RETRY_BACKOFF_MS,
  }: PriceServiceOptions) {
    this.logger = logger;
    this.url = `${cloudBaseUrl.replace(/\/+$/, '')}${BASE_PRICES_PATH}`;
    this.fetch = fetchOverride ?? globalThis.fetch;
    this.now = now;
    this.cacheTtlMs = cacheTtlMs;
    this.fetchTimeoutMs = fetchTimeoutMs;
    this.maxResponseBytes = maxResponseBytes;
    this.retryBackoffMs = retryBackoffMs;
  }

  public async getPrices(): Promise<PriceServiceResult> {
    const now = this.now();
    if (this.cached && now - this.cached.fetchedAtMs < this.cacheTtlMs) {
      return this.toResult(this.cached, false);
    }
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    if (now < this.retryAfterMs) {
      if (this.cached) {
        return this.toResult(this.cached, true);
      }
      throw this.lastError ?? new Error('Inference price refresh is waiting for retry backoff');
    }

    this.refreshPromise = this.refresh().finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private async refresh(): Promise<PriceServiceResult> {
    try {
      const fetchedAtMs = this.now();
      const { response, text } = await this.fetchWithTimeout();
      if (!response.ok) {
        throw new Error(
          `Inference price request failed with ${response.status} ${response.statusText}`
        );
      }
      const catalog = parseInferencePrices({
        response: JSON.parse(text),
        effectiveAt: new Date(fetchedAtMs),
        logger: this.logger,
      });
      this.cached = { catalog, fetchedAtMs };
      this.consecutiveFailures = 0;
      this.retryAfterMs = 0;
      this.lastError = undefined;
      return this.toResult(this.cached, false);
    } catch (error) {
      const failure = toError(error);
      this.consecutiveFailures += 1;
      const backoff = Math.min(
        this.retryBackoffMs * 2 ** (this.consecutiveFailures - 1),
        MAX_RETRY_BACKOFF_MS
      );
      this.retryAfterMs = this.now() + backoff;
      this.lastError = failure;
      this.logger.warn(
        `Inference price refresh failed; retrying after ${backoff}ms: ${failure.message}`
      );
      if (this.cached) {
        return this.toResult(this.cached, true);
      }
      throw failure;
    }
  }

  private async fetchWithTimeout(): Promise<{
    response: PriceFetchResponse;
    text: string;
  }> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.fetchTimeoutMs);
    timeout.unref?.();
    try {
      const response = await this.fetch(this.url, { signal: controller.signal });
      const text = response.ok
        ? await readLimitedResponseText(response, this.maxResponseBytes)
        : '';
      return { response, text };
    } catch (error) {
      if (timedOut) {
        throw new Error(`Inference price request timed out after ${this.fetchTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private toResult(
    cached: { catalog: ParsedPriceCatalog; fetchedAtMs: number },
    stale: boolean
  ): PriceServiceResult {
    return {
      catalog: cached.catalog,
      fetchedAt: new Date(cached.fetchedAtMs).toISOString(),
      stale,
    };
  }
}
