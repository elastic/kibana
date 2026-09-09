/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loggerMock } from '@kbn/logging-mocks';
import { createPriceService, type PriceService, type PriceServiceFetch } from './price_service';

const mockFetchFn = (): jest.Mock<ReturnType<PriceServiceFetch>, Parameters<PriceServiceFetch>> =>
  jest.fn<ReturnType<PriceServiceFetch>, Parameters<PriceServiceFetch>>();

const FIXTURE: unknown[] = JSON.parse(
  readFileSync(resolve(__dirname, '__fixtures__/base_prices.json'), 'utf8')
) as unknown[];

const NOW = new Date('2026-09-09T12:00:00.000Z');
const MAX_BODY_BYTES = 4 * 1024 * 1024;

const jsonResponse = (
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Awaited<ReturnType<PriceServiceFetch>> => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(text).byteLength),
      ...init.headers,
    },
  });
};

const catalogRow = (overrides: Record<string, unknown>) => ({
  id: 'global.inference-chat-input_test-model',
  name: 'Test Model - Chat Completion - Input',
  product_type: 'inference',
  start: '2026-01-01T00:00:00Z',
  end: null,
  unit: '1M Token',
  unit_amount: 1,
  token_tier: null,
  ...overrides,
});

const createService = ({
  fetchFn,
  getNow = () => new Date(NOW),
  timeoutMs = 10_000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
  maxBodyBytes = MAX_BODY_BYTES,
  maxScopedRows = 10_000,
  baseUrl = 'https://cloud.elastic.co',
}: {
  fetchFn: PriceServiceFetch;
  getNow?: () => Date;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxBodyBytes?: number;
  maxScopedRows?: number;
  baseUrl?: string;
}): PriceService =>
  createPriceService({
    fetchFn,
    getNow,
    logger: loggerMock.create(),
    timeoutMs,
    cacheTtlMs,
    maxBodyBytes,
    maxScopedRows,
    baseUrl,
  });

describe('createPriceService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch until getPrices is called', () => {
    const fetchFn = mockFetchFn();
    createService({ fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('parses operations from id, ignores embeddings, rerank, and cache-write forms, and preserves provider prefixes', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();

    expect(result).not.toBeNull();
    expect(result?.stale).toBe(false);
    expect(result?.fetchedAt).toBe(NOW.toISOString());
    expect(result?.prices.has('anthropic-claude-4.6-sonnet')).toBe(true);
    expect(result?.prices.get('anthropic-claude-4.6-sonnet')).toEqual({
      input: 4.5,
      output: 21,
      cacheRead: 0.45,
      tierThreshold: null,
    });
    expect(result?.prices.get('openai-gpt-5.4')).toEqual({
      input: 3.75,
      output: 21,
      cacheRead: 0.375,
      tierThreshold: 272_000,
    });
    expect(
      [...(result?.prices.keys() ?? [])].some(
        (key) => key.includes('embedding') || key.includes('rerank') || key.includes('jina')
      )
    ).toBe(false);
  });

  it('parses the model key from name with a case-insensitive chat-completion delimiter', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_custom',
          name: 'Acme Provider Model - CHAT COMPLETION - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_custom',
          name: 'Acme Provider Model - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('acme-provider-model')).toEqual({
      input: 1,
      output: 2,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it('normalizes mixed-case token tiers', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_tiered_0-200k',
          name: 'Tiered Model - Chat Completion - Input',
          token_tier: '<=200K',
          unit_amount: 3,
        }),
        catalogRow({
          id: 'global.inference-chat-input_tiered_200k-inf',
          name: 'Tiered Model - Chat Completion - Input',
          token_tier: '>200k',
          unit_amount: 6,
        }),
        catalogRow({
          id: 'global.inference-chat-output_tiered_0-200k',
          name: 'Tiered Model - Chat Completion - Output',
          token_tier: '<=200K',
          unit_amount: 9,
        }),
        catalogRow({
          id: 'global.inference-chat-output_tiered_200k-inf',
          name: 'Tiered Model - Chat Completion - Output',
          token_tier: '>200k',
          unit_amount: 18,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('tiered-model')).toEqual({
      input: 3,
      output: 9,
      cacheRead: null,
      tierThreshold: 200_000,
    });
  });

  it('applies exclusive end and inclusive start effective-date bounds', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-input_expired',
          name: 'Bounded Model - Chat Completion - Input',
          start: '2026-01-01T00:00:00Z',
          end: NOW.toISOString(),
          unit_amount: 99,
        }),
        catalogRow({
          id: 'global.inference-chat-input_future',
          name: 'Bounded Model - Chat Completion - Input',
          start: '2026-09-10T00:00:00Z',
          unit_amount: 88,
        }),
        catalogRow({
          id: 'global.inference-chat-input_active',
          name: 'Bounded Model - Chat Completion - Input',
          start: NOW.toISOString(),
          unit_amount: 4,
        }),
        catalogRow({
          id: 'global.inference-chat-output_active',
          name: 'Bounded Model - Chat Completion - Output',
          start: NOW.toISOString(),
          unit_amount: 5,
        }),
      ])
    );

    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('bounded-model')).toEqual({
      input: 4,
      output: 5,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it('rejects a refresh when an effective chat row is not priced per 1M Token or has a null amount', async () => {
    const fetchFn = mockFetchFn()
      .mockResolvedValueOnce(
        jsonResponse([
          catalogRow({ unit: '1M Tokens' }),
          catalogRow({
            id: 'global.inference-chat-output_test-model',
            name: 'Test Model - Chat Completion - Output',
          }),
        ])
      )
      .mockResolvedValueOnce(
        jsonResponse([
          catalogRow({ unit_amount: null }),
          catalogRow({
            id: 'global.inference-chat-output_test-model',
            name: 'Test Model - Chat Completion - Output',
          }),
        ])
      );

    const service = createService({ fetchFn });
    await expect(service.getPrices()).resolves.toBeNull();
    await expect(service.getPrices()).resolves.toBeNull();
  });

  it('filters to global inference rows and rejects more than 10,000 scoped rows', async () => {
    const padding = Array.from({ length: 9_998 }, (_, index) =>
      catalogRow({
        id: `global.inference-embed-text-dense_pad-${index}`,
        name: `Pad ${index} - Dense Text Embedding`,
        product_type: 'inference',
      })
    );
    const accepted = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'serverless.inference-chat-input_ignored',
          name: 'Ignored - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Flat - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Flat - Chat Completion - Output',
          unit_amount: 2,
        }),
        ...padding,
      ])
    );
    await expect(createService({ fetchFn: accepted }).getPrices()).resolves.toMatchObject({
      stale: false,
    });

    const tooMany = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'serverless.inference-chat-input_ignored',
          name: 'Ignored - Chat Completion - Input',
        }),
        ...Array.from({ length: 10_001 }, (_, index) =>
          catalogRow({
            id: `global.inference-chat-input_row-${index}`,
            name: `Row ${index} - Chat Completion - Input`,
          })
        ),
      ])
    );
    await expect(createService({ fetchFn: tooMany }).getPrices()).resolves.toBeNull();
  });

  it('accepts a catalog under the 4 MiB limit and rejects one over it', async () => {
    const under = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    await expect(createService({ fetchFn: under }).getPrices()).resolves.toMatchObject({
      stale: false,
    });

    const overHeader = mockFetchFn().mockResolvedValue(
      jsonResponse([], { headers: { 'content-length': String(MAX_BODY_BYTES + 1) } })
    );
    await expect(createService({ fetchFn: overHeader }).getPrices()).resolves.toBeNull();

    const chunk = new Uint8Array(1024 * 1024);
    const overBody = mockFetchFn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          for (let i = 0; i < 5; i++) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      }),
    });
    await expect(createService({ fetchFn: overBody }).getPrices()).resolves.toBeNull();
  });

  it('keeps the timeout active while the body is still streaming', async () => {
    const fetchFn = mockFetchFn().mockImplementation((_url, init) => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            const onAbort = () => {
              controller.error(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            };
            if (init.signal.aborted) {
              onAbort();
              return;
            }
            init.signal.addEventListener('abort', onAbort);
          },
        }),
      });
    });

    const pending = createService({ fetchFn, timeoutMs: 10_000 }).getPrices();
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toBeNull();
  });

  it('returns one in-flight refresh to concurrent callers and uses the fresh cache afterward', async () => {
    let resolveFetch: (value: Awaited<ReturnType<PriceServiceFetch>>) => void = () => undefined;
    const fetchFn = mockFetchFn().mockImplementation(
      () =>
        new Promise((settle) => {
          resolveFetch = settle;
        })
    );
    const service = createService({ fetchFn });
    const first = service.getPrices();
    const second = service.getPrices();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('https://cloud.elastic.co/api/v1/prices/base_prices', {
      signal: expect.any(AbortSignal),
    });
    resolveFetch(jsonResponse(FIXTURE));
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);

    await expect(service.getPrices()).resolves.toEqual(firstResult);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('strips trailing slashes from the cloud base URL', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    await createService({ fetchFn, baseUrl: 'https://cloud.elastic.co/' }).getPrices();
    expect(fetchFn).toHaveBeenCalledWith(
      'https://cloud.elastic.co/api/v1/prices/base_prices',
      expect.any(Object)
    );
  });

  it('returns null on cold failure and stale prices with the original fetchedAt on warm failure', async () => {
    const fetchFn = mockFetchFn()
      .mockResolvedValueOnce(jsonResponse(FIXTURE))
      .mockRejectedValueOnce(new Error('network down'));
    const getNow = jest.fn(() => new Date(NOW));
    const service = createService({ fetchFn, getNow });

    const fresh = await service.getPrices();
    expect(fresh?.stale).toBe(false);
    expect(fresh?.fetchedAt).toBe(NOW.toISOString());

    getNow.mockReturnValue(new Date(NOW.getTime() + 6 * 60 * 60 * 1000));
    const stale = await service.getPrices();
    expect(stale).toEqual({
      prices: fresh?.prices,
      fetchedAt: NOW.toISOString(),
      stale: true,
    });
  });

  it('lets a newer coherent tier generation supersede an older flat generation', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('openai-gpt-5.6-luna')).toEqual({
      input: 0.3,
      output: 1.68,
      cacheRead: 0.03,
      tierThreshold: 272_000,
    });
  });

  it('does not fall back when the latest generation is incomplete', async () => {
    const catalog = (FIXTURE as Array<Record<string, unknown>>).filter(
      (row) =>
        row.id !== 'global.inference-chat-input_openai-gpt-5-6-luna_272k-inf' &&
        typeof row.name === 'string' &&
        (row.name.startsWith('OpenAI GPT-5.6 Luna - Chat Completion') ||
          row.name.startsWith('Anthropic Claude 4.6 Sonnet - Chat Completion'))
    );
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(catalog));
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('anthropic-claude-4.6-sonnet')).toBe(true);
    expect(result?.prices.has('openai-gpt-5.6-luna')).toBe(false);
  });

  it('rejects an operation when the latest generation has duplicate rows', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({ unit_amount: 1 }),
        catalogRow({ unit_amount: 1 }),
        catalogRow({
          id: 'global.inference-chat-output_test-model',
          name: 'Test Model - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );
    await expect(createService({ fetchFn }).getPrices()).resolves.toBeNull();
  });

  it('omits a model that is missing input or output and accepts a missing cache-read price', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(
      jsonResponse([
        catalogRow({
          id: 'global.inference-chat-output_output-only',
          name: 'Output Only - Chat Completion - Output',
        }),
        catalogRow({
          id: 'global.inference-chat-input_complete',
          name: 'Complete Flat - Chat Completion - Input',
        }),
        catalogRow({
          id: 'global.inference-chat-output_complete',
          name: 'Complete Flat - Chat Completion - Output',
          unit_amount: 2,
        }),
      ])
    );
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.has('output-only')).toBe(false);
    expect(result?.prices.get('complete-flat')).toEqual({
      input: 1,
      output: 2,
      cacheRead: null,
      tierThreshold: null,
    });
  });

  it('rejects a model when operations mix flat and tiered prices or thresholds', async () => {
    const mixed = [
      catalogRow({
        id: 'global.inference-chat-input_mixed',
        name: 'Mixed Model - Chat Completion - Input',
      }),
      catalogRow({
        id: 'global.inference-chat-output_mixed_0-200k',
        name: 'Mixed Model - Chat Completion - Output',
        token_tier: '<=200k',
        unit_amount: 2,
      }),
      catalogRow({
        id: 'global.inference-chat-output_mixed_200k-inf',
        name: 'Mixed Model - Chat Completion - Output',
        token_tier: '>200k',
        unit_amount: 4,
      }),
    ];
    const mismatched = [
      catalogRow({
        id: 'global.inference-chat-input_mismatch_0-200k',
        name: 'Mismatch Model - Chat Completion - Input',
        token_tier: '<=200k',
      }),
      catalogRow({
        id: 'global.inference-chat-input_mismatch_200k-inf',
        name: 'Mismatch Model - Chat Completion - Input',
        token_tier: '>200k',
        unit_amount: 2,
      }),
      catalogRow({
        id: 'global.inference-chat-output_mismatch_0-272k',
        name: 'Mismatch Model - Chat Completion - Output',
        token_tier: '<=272k',
        unit_amount: 3,
      }),
      catalogRow({
        id: 'global.inference-chat-output_mismatch_272k-inf',
        name: 'Mismatch Model - Chat Completion - Output',
        token_tier: '>272k',
        unit_amount: 6,
      }),
    ];

    await expect(
      createService({
        fetchFn: mockFetchFn().mockResolvedValue(jsonResponse(mixed)),
      }).getPrices()
    ).resolves.toBeNull();
    await expect(
      createService({
        fetchFn: mockFetchFn().mockResolvedValue(jsonResponse(mismatched)),
      }).getPrices()
    ).resolves.toBeNull();
  });

  it('accepts differing operation start dates', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();
    expect(result?.prices.get('anthropic-claude-4.6-sonnet')?.cacheRead).toBe(0.45);
    expect(result?.prices.get('openai-gpt-5.4')?.cacheRead).toBe(0.375);
  });

  it('returns PriceResult with prices, fetchedAt, and stale', async () => {
    const fetchFn = mockFetchFn().mockResolvedValue(jsonResponse(FIXTURE));
    const result = await createService({ fetchFn }).getPrices();
    expect(result).toEqual(
      expect.objectContaining({
        prices: expect.any(Map),
        fetchedAt: NOW.toISOString(),
        stale: false,
      })
    );
  });
});
