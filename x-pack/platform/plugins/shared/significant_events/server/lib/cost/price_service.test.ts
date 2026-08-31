/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  InferencePriceService,
  normalizeInferenceModelName,
  parseInferencePrices,
} from './price_service';

const EFFECTIVE_AT = new Date('2026-08-31T12:00:00.000Z');

const priceRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'global.inference-chat-input_openai-gpt-5-4',
  created: '2026-01-01T00:00:00.000Z',
  name: 'OpenAI GPT-5.4 - Chat Completion - Input',
  product_type: 'inference',
  start: '2026-01-01T00:00:00.000Z',
  end: null,
  unit: '1M Token',
  unit_amount: 2.5,
  token_tier: null,
  ...overrides,
});

const responseFor = (rows: Array<Record<string, unknown>>): Response =>
  new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('parseInferencePrices', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses the frozen live response and resolves every observed c0 model id', () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, '__fixtures__/base_prices.json'), 'utf8')
    );

    expect(fixture).toHaveLength(2043);
    expect(
      fixture.filter(({ product_type }: { product_type: string }) => product_type === 'inference')
    ).toHaveLength(459);

    const catalog = parseInferencePrices({
      response: fixture,
      effectiveAt: EFFECTIVE_AT,
      logger,
    });
    const observedModelIds = [
      'anthropic-claude-4.5-haiku',
      'anthropic-claude-4.6-opus',
      'anthropic-claude-4.6-sonnet',
      'anthropic-claude-5-sonnet',
      'openai-gpt-5.2',
      'openai-gpt-5.4',
      'openai-gpt-5.6-sol',
    ];

    for (const modelId of observedModelIds) {
      expect(catalog.pricesByModel.has(modelId)).toBe(true);
    }
    expect(catalog.currency).toEqual({
      code: 'USD',
      symbol: '$',
      assumed: true,
      unit: '1M Token',
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('derives the operation from the id and normalizes token-tier casing', () => {
    const catalog = parseInferencePrices({
      response: [
        priceRow({
          id: 'global.inference-chat-output_openai-gpt-5-4_272k-inf',
          name: 'OpenAI GPT-5.4 - Chat Completion - Output (Prompts >272K tokens)',
          token_tier: '>272K',
        }),
        priceRow({
          id: 'global.inference-chat-cache-read_anthropic-claude-4-5-sonnet_200k-inf',
          name: 'Anthropic Claude 4.5 Sonnet - Chat Completion - Cache Read (Prompts >200K tokens)',
          token_tier: '>200k',
        }),
      ],
      effectiveAt: EFFECTIVE_AT,
      logger,
    });

    expect(catalog.pricesByModel.get('openai-gpt-5.4')).toEqual([
      expect.objectContaining({
        operation: 'output',
        promptTier: { raw: '>272k', threshold: 272000, direction: 'above' },
      }),
    ]);
    expect(catalog.pricesByModel.get('anthropic-claude-4.5-sonnet')).toEqual([
      expect.objectContaining({
        operation: 'cache_read',
        promptTier: { raw: '>200k', threshold: 200000, direction: 'above' },
      }),
    ]);
  });

  it('normalizes the model name rather than using the price id model segment', () => {
    expect(normalizeInferenceModelName('Anthropic Claude 4.7 Opus - Chat Completion - Input')).toBe(
      'anthropic-claude-4.7-opus'
    );
  });

  it('pins prices to global.inference and warns when another scope diverges', () => {
    const catalog = parseInferencePrices({
      response: [
        priceRow(),
        priceRow({
          id: 'cloud_connect.inference-chat-input_openai-gpt-5-4',
          unit_amount: 99,
        }),
      ],
      effectiveAt: EFFECTIVE_AT,
      logger,
    });

    expect(catalog.pricesByModel.get('openai-gpt-5.4')?.[0].unitAmount).toBe(2.5);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('diverges between global.inference and cloud_connect.inference')
    );
  });

  it('ignores rows outside their effective interval', () => {
    const catalog = parseInferencePrices({
      response: [
        priceRow({
          name: 'OpenAI Current - Chat Completion - Input',
        }),
        priceRow({
          id: 'global.inference-chat-input_openai-expired',
          name: 'OpenAI Expired - Chat Completion - Input',
          end: '2026-08-01T00:00:00.000Z',
        }),
        priceRow({
          id: 'global.inference-chat-input_openai-future',
          name: 'OpenAI Future - Chat Completion - Input',
          start: '2026-09-01T00:00:00.000Z',
        }),
      ],
      effectiveAt: EFFECTIVE_AT,
      logger,
    });

    expect([...catalog.pricesByModel.keys()]).toEqual(['openai-current']);
  });

  it('rejects ambiguous active duplicates instead of picking by iteration order', () => {
    expect(() =>
      parseInferencePrices({
        response: [priceRow(), priceRow({ unit_amount: 3 })],
        effectiveAt: EFFECTIVE_AT,
        logger,
      })
    ).toThrow('Ambiguous active inference prices');
  });

  it('drops the dollar symbol and logs when a non-USD currency field appears', () => {
    const catalog = parseInferencePrices({
      response: [priceRow({ currency: 'EUR' })],
      effectiveAt: EFFECTIVE_AT,
      logger,
    });

    expect(catalog.currency).toEqual({
      code: null,
      symbol: null,
      assumed: false,
      unit: '1M Token',
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('EUR'));
  });
});

describe('InferencePriceService', () => {
  const logger = loggingSystemMock.createLogger();
  let now: number;

  beforeEach(() => {
    jest.clearAllMocks();
    now = EFFECTIVE_AT.getTime();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the configured Cloud base URL and caches a successful response for six hours', async () => {
    const fetch = jest.fn().mockResolvedValue(responseFor([priceRow()]));
    const service = new InferencePriceService({
      logger,
      cloudBaseUrl: 'https://example.elastic.test/',
      fetch,
      now: () => now,
    });

    const first = await service.getPrices();
    now += 6 * 60 * 60_000 - 1;
    const cached = await service.getPrices();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.elastic.test/api/v1/prices/base_prices',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(first.stale).toBe(false);
    expect(cached).toEqual(first);
  });

  it('coalesces concurrent refreshes into one request', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );
    const service = new InferencePriceService({ logger, fetch, now: () => now });

    const first = service.getPrices();
    const second = service.getPrices();
    expect(fetch).toHaveBeenCalledTimes(1);
    resolveFetch?.(responseFor([priceRow()]));

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ stale: false }),
      expect.objectContaining({ stale: false }),
    ]);
  });

  it('serves stale data and applies retry backoff after a refresh failure', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(responseFor([priceRow()]))
      .mockRejectedValueOnce(new Error('offline'));
    const service = new InferencePriceService({
      logger,
      fetch,
      now: () => now,
      cacheTtlMs: 100,
      retryBackoffMs: 1_000,
    });

    await service.getPrices();
    now += 101;
    await expect(service.getPrices()).resolves.toEqual(expect.objectContaining({ stale: true }));
    await expect(service.getPrices()).resolves.toEqual(expect.objectContaining({ stale: true }));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('offline'));
  });

  it('aborts requests that exceed the configured timeout', async () => {
    jest.useFakeTimers();
    const fetch = jest.fn(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );
    const service = new InferencePriceService({
      logger,
      fetch,
      now: () => now,
      fetchTimeoutMs: 100,
    });

    const result = expect(service.getPrices()).rejects.toThrow('timed out after 100ms');
    await jest.advanceTimersByTimeAsync(101);

    await result;
  });

  it('rejects streamed responses that exceed the configured byte limit', async () => {
    const fetch = jest.fn().mockResolvedValue(new Response('12345'));
    const service = new InferencePriceService({
      logger,
      fetch,
      now: () => now,
      maxResponseBytes: 4,
    });

    await expect(service.getPrices()).rejects.toThrow('exceeds 4 bytes');
  });
});
