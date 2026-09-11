/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

export type PriceMap = Map<string, ModelPrice>;

export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number | null;
  tierThreshold: number | null;
}

export interface PriceResult {
  prices: PriceMap;
  fetchedAt: string;
  stale: boolean;
}

export interface PriceService {
  getPrices: () => Promise<PriceResult | null>;
}

export type PriceServiceFetch = (
  input: string,
  init: { signal: AbortSignal }
) => Promise<{
  ok: boolean;
  status: number;
  headers: { get: (name: string) => string | null };
  body: ReadableStream<Uint8Array> | null;
}>;

export interface PriceServiceDeps {
  fetchFn: PriceServiceFetch;
  getNow: () => Date;
  logger: Logger;
  timeoutMs: number;
  cacheTtlMs: number;
  maxBodyBytes: number;
  maxScopedRows: number;
  baseUrl: string;
}

const PRICE_CATALOG_PATH = '/api/v1/prices/base_prices';
const CHAT_COMPLETION_DELIMITER = ' - chat completion - ';
const TOKEN_UNIT = '1M Token';
const TIER_PATTERN = /^(<=|>)(\d+)k$/;

const CACHE_WRITE_MARKERS = [
  '-chat-cache-write-5m_',
  '-chat-cache-write-1h_',
  '-chat-cache-write_',
] as const;

const PRICEABLE_OPERATION_MARKERS = [
  { marker: '-chat-cache-read_', operation: 'cache_read' },
  { marker: '-chat-input_', operation: 'input' },
  { marker: '-chat-output_', operation: 'output' },
] as const;

type PriceableOperation = 'input' | 'output' | 'cache_read';

type TierClassification =
  | { readonly kind: 'flat' }
  | { readonly kind: 'lower' | 'upper'; readonly threshold: number };

interface ParsedCatalogRow {
  modelKey: string;
  operation: PriceableOperation;
  startMs: number;
  amount: number;
  tier: TierClassification;
}

interface OperationPrice {
  amount: number;
  startMs: number;
  tier: Exclude<TierClassification, { kind: 'upper' }>;
}

interface SuccessfulCache {
  prices: PriceMap;
  fetchedAt: string;
  fetchedAtMs: number;
}

class PriceCatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceCatalogError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const boundedString = (value: unknown, maxLength: number): string | null => {
  if (typeof value !== 'string' || value.length > maxLength) {
    return null;
  }
  return value;
};

const boundedNullableString = (value: unknown, maxLength: number): string | null | undefined => {
  if (value === null) {
    return null;
  }
  return boundedString(value, maxLength) === null ? undefined : (value as string);
};

const boundedNullableAmount = (value: unknown): number | null | undefined => {
  if (value === null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return undefined;
};

const parseTimestamp = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseOperation = (
  id: string
):
  | { kind: 'priceable'; operation: PriceableOperation }
  | { kind: 'ignore' }
  | { kind: 'unsupported' } => {
  if (CACHE_WRITE_MARKERS.some((marker) => id.includes(marker))) {
    return { kind: 'ignore' };
  }
  for (const { marker, operation } of PRICEABLE_OPERATION_MARKERS) {
    if (id.includes(marker)) {
      return { kind: 'priceable', operation };
    }
  }
  return { kind: 'unsupported' };
};

const parseModelKey = (name: string): string | null => {
  const delimiterIndex = name.toLowerCase().indexOf(CHAT_COMPLETION_DELIMITER);
  if (delimiterIndex < 0) {
    return null;
  }
  const prefix = name.slice(0, delimiterIndex).trim().toLowerCase().replace(/\s+/g, '-');
  return prefix.length > 0 ? prefix : null;
};

const parseTier = (tokenTier: string | null): TierClassification | null => {
  if (tokenTier === null) {
    return { kind: 'flat' };
  }
  const match = tokenTier.trim().toLowerCase().match(TIER_PATTERN);
  if (!match) {
    return null;
  }
  const threshold = Number(match[2]) * 1000;
  if (!Number.isFinite(threshold)) {
    return null;
  }
  return {
    kind: match[1] === '<=' ? 'lower' : 'upper',
    threshold,
  };
};

const validateScopedRow = (
  row: unknown
): {
  id: string;
  name: string;
  start: string;
  end: string | null;
  unit: string | null;
  unitAmount: number | null;
  tokenTier: string | null;
} => {
  if (!isRecord(row)) {
    throw new PriceCatalogError('Inference catalog row is not an object');
  }
  const id = boundedString(row.id, 512);
  const name = boundedString(row.name, 512);
  const productType = boundedString(row.product_type, 128);
  const start = boundedString(row.start, 64);
  const end = boundedNullableString(row.end, 64);
  const unit = boundedNullableString(row.unit, 64);
  const unitAmount = boundedNullableAmount(row.unit_amount);
  const tokenTier = boundedNullableString(row.token_tier, 64);
  if (
    id === null ||
    name === null ||
    productType === null ||
    start === null ||
    end === undefined ||
    unit === undefined ||
    unitAmount === undefined ||
    tokenTier === undefined
  ) {
    throw new PriceCatalogError('Inference catalog row failed bounded field validation');
  }
  return { id, name, start, end, unit, unitAmount, tokenTier };
};

const selectLatestOperationPrice = (rows: ParsedCatalogRow[]): OperationPrice | null => {
  const latestStartMs = Math.max(...rows.map((row) => row.startMs));
  const latest = rows.filter((row) => row.startMs === latestStartMs);
  if (latest.length === 1 && latest[0].tier.kind === 'flat') {
    return { amount: latest[0].amount, startMs: latestStartMs, tier: { kind: 'flat' } };
  }
  if (latest.length === 2) {
    const lower = latest.find((row) => row.tier.kind === 'lower');
    const upper = latest.find((row) => row.tier.kind === 'upper');
    if (
      lower &&
      upper &&
      lower.tier.kind !== 'flat' &&
      upper.tier.kind !== 'flat' &&
      lower.tier.threshold === upper.tier.threshold
    ) {
      return {
        amount: lower.amount,
        startMs: latestStartMs,
        tier: { kind: 'lower', threshold: lower.tier.threshold },
      };
    }
  }
  return null;
};

const buildPriceMap = (rows: ParsedCatalogRow[], logger: Logger): PriceMap => {
  const grouped = new Map<string, Map<PriceableOperation, ParsedCatalogRow[]>>();
  for (const row of rows) {
    const byOperation =
      grouped.get(row.modelKey) ?? new Map<PriceableOperation, ParsedCatalogRow[]>();
    const operationRows = byOperation.get(row.operation) ?? [];
    operationRows.push(row);
    byOperation.set(row.operation, operationRows);
    grouped.set(row.modelKey, byOperation);
  }

  const prices: PriceMap = new Map();
  for (const [modelKey, byOperation] of grouped) {
    const inputRows = byOperation.get('input');
    const outputRows = byOperation.get('output');
    const cacheReadRows = byOperation.get('cache_read');
    if (!inputRows || !outputRows) {
      logger.warn(`Omitting unusable price model "${modelKey}": missing input or output prices`);
      continue;
    }
    const input = selectLatestOperationPrice(inputRows);
    const output = selectLatestOperationPrice(outputRows);
    if (!input || !output) {
      logger.warn(
        `Omitting unusable price model "${modelKey}": latest input or output generation is invalid`
      );
      continue;
    }
    let cacheRead: OperationPrice | null = null;
    if (cacheReadRows) {
      const selected = selectLatestOperationPrice(cacheReadRows);
      if (!selected) {
        logger.warn(
          `Omitting unusable price model "${modelKey}": latest cache-read generation is invalid`
        );
        continue;
      }
      cacheRead = selected;
    }
    const operations = cacheRead ? [input, output, cacheRead] : [input, output];
    const allFlat = operations.every((operation) => operation.tier.kind === 'flat');
    const allTiered = operations.every((operation) => operation.tier.kind === 'lower');
    if (!allFlat && !allTiered) {
      logger.warn(`Omitting unusable price model "${modelKey}": mixed flat and tiered operations`);
      continue;
    }
    let tierThreshold: number | null = null;
    if (allTiered) {
      const thresholds = operations.map((operation) =>
        operation.tier.kind === 'lower' ? operation.tier.threshold : null
      );
      if (thresholds.some((threshold) => threshold !== thresholds[0])) {
        logger.warn(`Omitting unusable price model "${modelKey}": mismatched tier thresholds`);
        continue;
      }
      tierThreshold = thresholds[0];
    }
    prices.set(modelKey, {
      input: input.amount,
      output: output.amount,
      cacheRead: cacheRead ? cacheRead.amount : null,
      tierThreshold,
    });
  }
  return prices;
};

const parseCatalog = ({
  payload,
  effectiveMs,
  maxScopedRows,
  logger,
}: {
  payload: unknown;
  effectiveMs: number;
  maxScopedRows: number;
  logger: Logger;
}): PriceMap => {
  if (!Array.isArray(payload)) {
    throw new PriceCatalogError('Price catalog response is not an array');
  }

  const scopedRows = payload.filter(
    (row): row is Record<string, unknown> & { id: string } =>
      isRecord(row) &&
      row.product_type === 'inference' &&
      typeof row.id === 'string' &&
      row.id.startsWith('global.inference-')
  );
  if (scopedRows.length > maxScopedRows) {
    throw new PriceCatalogError(`Price catalog exceeded ${maxScopedRows} scoped inference rows`);
  }

  const parsedRows: ParsedCatalogRow[] = [];
  for (const scopedRow of scopedRows) {
    const operation = parseOperation(scopedRow.id);
    if (operation.kind === 'unsupported' || operation.kind === 'ignore') {
      continue;
    }
    const row = validateScopedRow(scopedRow);
    if (row.unit !== TOKEN_UNIT || row.unitAmount === null) {
      throw new PriceCatalogError(`Invalid unit or amount for ${row.id}`);
    }
    const startMs = parseTimestamp(row.start);
    const endMs = row.end === null ? null : parseTimestamp(row.end);
    if (startMs === null || (row.end !== null && endMs === null)) {
      throw new PriceCatalogError(`Invalid effective dates for ${row.id}`);
    }
    if (startMs > effectiveMs || (endMs !== null && effectiveMs >= endMs)) {
      continue;
    }
    const modelKey = parseModelKey(row.name);
    const tier = parseTier(row.tokenTier);
    if (modelKey === null || tier === null) {
      throw new PriceCatalogError(`Invalid model name or token tier for ${row.id}`);
    }
    parsedRows.push({
      modelKey,
      operation: operation.operation,
      startMs,
      amount: row.unitAmount,
      tier,
    });
  }

  const prices = buildPriceMap(parsedRows, logger);
  if (prices.size === 0) {
    throw new PriceCatalogError('Price catalog contained no usable models');
  }
  return prices;
};

const readBoundedBody = async ({
  response,
  maxBodyBytes,
  signal,
}: {
  response: Awaited<ReturnType<PriceServiceFetch>>;
  maxBodyBytes: number;
  signal: AbortSignal;
}): Promise<string> => {
  const contentLengthHeader = response.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > maxBodyBytes) {
      throw new PriceCatalogError('Price catalog response exceeds size limit');
    }
  }
  if (!response.body) {
    throw new PriceCatalogError('Price catalog response has no body');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      if (signal.aborted) {
        throw new PriceCatalogError('Price catalog request timed out');
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      received += value.byteLength;
      if (received > maxBodyBytes) {
        await reader.cancel();
        throw new PriceCatalogError('Price catalog response exceeds size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export const createPriceService = ({
  fetchFn,
  getNow,
  logger,
  timeoutMs,
  cacheTtlMs,
  maxBodyBytes,
  maxScopedRows,
  baseUrl,
}: PriceServiceDeps): PriceService => {
  const catalogUrl = `${baseUrl.replace(/\/+$/, '')}${PRICE_CATALOG_PATH}`;
  let cache: SuccessfulCache | null = null;
  let inFlight: Promise<PriceResult | null> | null = null;

  const refresh = async (): Promise<PriceResult | null> => {
    const requestedAt = getNow();
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    try {
      const response = await fetchFn(catalogUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new PriceCatalogError(`Price catalog request failed with status ${response.status}`);
      }
      const body = await readBoundedBody({ response, maxBodyBytes, signal: controller.signal });
      const payload: unknown = JSON.parse(body);
      const prices = parseCatalog({
        payload,
        effectiveMs: requestedAt.getTime(),
        maxScopedRows,
        logger,
      });
      const fetchedAt = requestedAt.toISOString();
      cache = {
        prices,
        fetchedAt,
        fetchedAtMs: requestedAt.getTime(),
      };
      return { prices, fetchedAt, stale: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (cache) {
        logger.warn(`Failed to refresh inference prices; serving stale catalog: ${message}`);
        return {
          prices: cache.prices,
          fetchedAt: cache.fetchedAt,
          stale: true,
        };
      }
      logger.error(`Failed to fetch inference prices: ${message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getPrices: async (): Promise<PriceResult | null> => {
      if (cache && getNow().getTime() - cache.fetchedAtMs < cacheTtlMs) {
        return {
          prices: cache.prices,
          fetchedAt: cache.fetchedAt,
          stale: false,
        };
      }
      if (inFlight) {
        return inFlight;
      }
      const pending = refresh().finally(() => {
        if (inFlight === pending) {
          inFlight = null;
        }
      });
      inFlight = pending;
      return pending;
    },
  };
};
