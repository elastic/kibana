/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import catalogRows from './__fixtures__/price_catalog_rows.json';
import type { PriceCatalogFetch } from './price_catalog';
import { createPriceCatalog, parsePriceCatalog } from './price_catalog';

const NOW = new Date('2026-10-13T10:00:00.000Z');

const okResponse = (payload: unknown): ReturnType<PriceCatalogFetch> =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(payload),
  });

describe('parsePriceCatalog', () => {
  it('builds per-model prices from chat completion rows', () => {
    const prices = parsePriceCatalog(catalogRows, NOW);

    expect(prices.get('anthropic-claude-4-5-haiku')).toEqual({
      input: 1.5,
      output: 7,
      cacheRead: 0.15,
    });
    expect(prices.get('google-gemini-3-7-flash')).toEqual({
      input: 2.25,
      output: 10.5,
      cacheRead: 0.225,
    });
  });

  it('prices tiered models at the lower tier', () => {
    const prices = parsePriceCatalog(catalogRows, NOW);

    expect(prices.get('openai-gpt-5-6-luna')).toEqual({
      input: 0.3,
      output: 1.68,
      cacheRead: 0.03,
    });
  });

  it('ignores prices that are not yet or no longer effective', () => {
    const rows = [
      {
        id: 'global.inference-chat-input_vendor-model',
        product_type: 'inference',
        unit: '1M Token',
        unit_amount: 1,
        start: '2026-01-01T00:00:00Z',
        end: '2026-10-01T00:00:00Z',
      },
      {
        id: 'global.inference-chat-input_vendor-model',
        product_type: 'inference',
        unit: '1M Token',
        unit_amount: 2,
        start: '2026-10-01T00:00:00Z',
        end: null,
      },
      {
        id: 'global.inference-chat-input_vendor-model',
        product_type: 'inference',
        unit: '1M Token',
        unit_amount: 3,
        start: '2026-11-01T00:00:00Z',
        end: null,
      },
      {
        id: 'global.inference-chat-output_vendor-model',
        product_type: 'inference',
        unit: '1M Token',
        unit_amount: 4,
        start: '2026-01-01T00:00:00Z',
        end: null,
      },
    ];

    expect(parsePriceCatalog(rows, NOW).get('vendor-model')).toEqual({ input: 2, output: 4 });
  });

  it('skips models without both an input and an output price', () => {
    const rows = [
      {
        id: 'global.inference-chat-input_vendor-half',
        product_type: 'inference',
        unit: '1M Token',
        unit_amount: 1,
        start: '2026-01-01T00:00:00Z',
        end: null,
      },
    ];

    expect(parsePriceCatalog(rows, NOW).size).toBe(0);
  });

  it('rejects a payload that is not an array', () => {
    expect(() => parsePriceCatalog({ prices: [] }, NOW)).toThrow('not an array');
  });
});

describe('createPriceCatalog', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the catalog from the base URL and caches it', async () => {
    const fetchFn = jest.fn<ReturnType<PriceCatalogFetch>, Parameters<PriceCatalogFetch>>(() =>
      okResponse(catalogRows)
    );
    const catalog = createPriceCatalog({
      fetchFn,
      baseUrl: 'https://cloud.example.com/',
      logger,
      getNow: () => NOW,
    });

    const first = await catalog.getPrices();
    const second = await catalog.getPrices();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe('https://cloud.example.com/api/v1/prices/base_prices');
    expect(first?.stale).toBe(false);
    expect(second?.prices.has('anthropic-claude-4-5-haiku')).toBe(true);
  });

  it('serves the last copy as stale when a refresh fails', async () => {
    let now = NOW;
    const fetchFn = jest
      .fn<ReturnType<PriceCatalogFetch>, Parameters<PriceCatalogFetch>>()
      .mockImplementationOnce(() => okResponse(catalogRows))
      .mockRejectedValueOnce(new Error('offline'));
    const catalog = createPriceCatalog({
      fetchFn,
      baseUrl: 'https://cloud.example.com',
      logger,
      getNow: () => now,
      cacheTtlMs: 1000,
    });

    await catalog.getPrices();
    now = new Date(NOW.getTime() + 2000);
    const snapshot = await catalog.getPrices();

    expect(snapshot?.stale).toBe(true);
    expect(snapshot?.prices.has('google-gemini-3-7-flash')).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });

  it('returns undefined when the catalog was never reachable', async () => {
    const catalog = createPriceCatalog({
      fetchFn: () =>
        Promise.resolve({
          ok: false,
          status: 503,
          headers: { get: () => null },
          text: async () => '',
        }),
      baseUrl: 'https://cloud.example.com',
      logger,
      getNow: () => NOW,
    });

    await expect(catalog.getPrices()).resolves.toBeUndefined();
  });

  it('rejects responses over the size limit', async () => {
    const catalog = createPriceCatalog({
      fetchFn: () =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => '999999999' },
          text: async () => '[]',
        }),
      baseUrl: 'https://cloud.example.com',
      logger,
      getNow: () => NOW,
    });

    await expect(catalog.getPrices()).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('size limit'));
  });
});
