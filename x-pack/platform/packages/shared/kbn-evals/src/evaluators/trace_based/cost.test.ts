/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createEstimatedCostEvaluator } from './cost';
import { estimateCostUsd, getModelPrice, getTokenRates, type ModelPrice } from './model_prices';

const VALID_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const COLUMNS = [
  { name: 'input_tokens', type: 'long' },
  { name: 'cached_tokens', type: 'long' },
  { name: 'output_tokens', type: 'long' },
  { name: 'model', type: 'keyword' },
  { name: 'prompt_tier', type: 'integer' },
];

type Row = Array<number | string | null>;

interface ChatTokens {
  input: number;
  cached?: number;
  output?: number;
  tier?: number;
}

// openai-gpt-5.6-sol: $7.5 input, $0.75 cached input, $42 output per 1M tokens; $15 / $1.5 / $63
// once a prompt exceeds 272k tokens.
const SOL = 'openai-gpt-5.6-sol';
// google-gemini-3.5-flash-lite: $0.45 input, $0.045 cached input, $3.5 output per 1M tokens.
const FLASH_LITE = 'google-gemini-3.5-flash-lite';

const chat = (
  model: string | null,
  { input, cached = 0, output = 0, tier = 0 }: ChatTokens
): Row => [input, cached, output, model, tier];

const priceOf = (model: string): ModelPrice => {
  const price = getModelPrice(model);
  if (!price) {
    throw new Error(`No price for ${model}`);
  }
  return price;
};

describe('createEstimatedCostEvaluator', () => {
  let mockEsClient: jest.Mocked<EsClient>;
  let mockLog: jest.Mocked<ToolingLog>;

  const evaluate = () =>
    createEstimatedCostEvaluator({ traceEsClient: mockEsClient, log: mockLog }).evaluate({
      input: {},
      output: { traceId: VALID_TRACE_ID },
      expected: {},
      metadata: {},
    });

  const queryMock = () => mockEsClient.esql.query as jest.Mock;

  const mockResponse = (values: Row[]) =>
    queryMock().mockResolvedValue({ columns: COLUMNS, values });

  beforeEach(() => {
    jest.useFakeTimers();
    mockEsClient = { esql: { query: jest.fn() } } as any;
    mockLog = {
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sums the priced usage of every model in the trace', async () => {
    mockResponse([
      chat(SOL, { input: 1_000_000, output: 100_000 }),
      chat(FLASH_LITE, { input: 1_000_000, output: 1_000_000 }),
    ]);

    const result = await evaluate();

    // SOL: 7.5 + 0.1 * 42 = 11.7, FLASH_LITE: 0.45 + 3.5 = 3.95
    expect(result.score).toBeCloseTo(15.65);
    expect(result.label).toBeUndefined();
    expect(result.explanation).toContain(SOL);
    expect(result.explanation).toContain(FLASH_LITE);
    expect(result.metadata?.models).toHaveLength(2);
    expect(queryMock()).toHaveBeenCalledTimes(1);
  });

  it('prices cache reads at the cached input rate', async () => {
    mockResponse([chat(SOL, { input: 1_000_000, cached: 600_000 })]);

    const result = await evaluate();

    // 400k uncached at 7.5 + 600k cached at 0.75
    expect(result.score).toBeCloseTo(3 + 0.45);
    expect(result.explanation).toContain('600000 cached');
  });

  it('prices requests above the long-context threshold at the higher tier', async () => {
    mockResponse([chat(SOL, { input: 1_000_000, tier: 272_000 }), chat(SOL, { input: 1_000_000 })]);

    const result = await evaluate();

    expect(result.score).toBeCloseTo(15 + 7.5);
    expect(result.explanation).toContain(`${SOL} (prompts >272k)`);
  });

  it('reports no score without retrying when a model has no price', async () => {
    mockResponse([
      chat(SOL, { input: 1_000_000, output: 100_000 }),
      chat('acme-unreleased-model', { input: 5_000, output: 500 }),
    ]);

    const result = await evaluate();

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.explanation).toContain(
      'Could not price acme-unreleased-model (no EIS list price)'
    );
    expect(queryMock()).toHaveBeenCalledTimes(1);
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it('reports spans without a model as unpriced', async () => {
    mockResponse([chat(null, { input: 5_000, output: 500 })]);

    const result = await evaluate();

    expect(result.score).toBeNull();
    expect(result.explanation).toContain('Could not price unknown (no EIS list price)');
  });

  it('reports no score when cache reads exceed input tokens', async () => {
    mockResponse([chat(SOL, { input: 1_000, cached: 5_000 })]);

    const result = await evaluate();

    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
    expect(result.explanation).toContain(
      `Could not price ${SOL} (cache reads exceed input tokens)`
    );
  });

  it('retries when the trace has no chat spans indexed yet', async () => {
    queryMock()
      .mockResolvedValueOnce({ columns: COLUMNS, values: [] })
      .mockResolvedValueOnce({ columns: COLUMNS, values: [chat(SOL, { input: 1_000_000 })] });

    const promise = evaluate();
    await jest.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.score).toBeCloseTo(7.5);
    expect(queryMock()).toHaveBeenCalledTimes(2);
  });

  it('describes a potentially incomplete result from the response it was scored on', async () => {
    queryMock()
      .mockResolvedValueOnce({ columns: COLUMNS, values: [chat(SOL, { input: 0 })] })
      .mockResolvedValue({ columns: COLUMNS, values: [] });

    const promise = evaluate();
    await jest.advanceTimersByTimeAsync(300_000);
    const result = await promise;

    expect(result.score).toBe(0);
    expect(result.label).toBe('potentially_incomplete');
    expect(result.explanation).toContain('may be based on incomplete trace data');
    expect(result.explanation).toContain(SOL);
    expect(result.metadata?.incomplete).toBe(true);
    expect(result.metadata?.models).toHaveLength(1);
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  describe('when the cache_read column is missing from the mapping', () => {
    const unknownColumnError = () =>
      new Error(
        'verification_exception\n\tRoot causes:\n\t\tverification_exception: Found 1 problem\n' +
          'line 1:79: Unknown column [attributes.gen_ai.usage.cache_read.input_tokens], ' +
          'did you mean [attributes.gen_ai.usage.input_tokens]?'
      );

    const COLUMNS_WITHOUT_CACHE = COLUMNS.filter(({ name }) => name !== 'cached_tokens');
    const withoutCache = (row: Row): Row => row.filter((_, index) => index !== 1);

    it('prices all input tokens at the uncached rate', async () => {
      queryMock()
        .mockRejectedValueOnce(unknownColumnError())
        .mockResolvedValueOnce({
          columns: COLUMNS_WITHOUT_CACHE,
          values: [withoutCache(chat(SOL, { input: 1_000_000 }))],
        });

      const result = await evaluate();

      expect(result.score).toBeCloseTo(7.5);
      expect(result.explanation).toContain('cache reads not reported');
      expect(queryMock()).toHaveBeenCalledTimes(2);
      expect(queryMock().mock.calls[1][0].query).not.toContain('cache_read');
      expect(mockLog.error).not.toHaveBeenCalled();
    });

    it('goes straight to the fallback query on retries', async () => {
      queryMock()
        .mockRejectedValueOnce(unknownColumnError())
        .mockResolvedValueOnce({
          columns: COLUMNS_WITHOUT_CACHE,
          values: [],
        })
        .mockResolvedValueOnce({
          columns: COLUMNS_WITHOUT_CACHE,
          values: [withoutCache(chat(SOL, { input: 1_000_000 }))],
        });

      const promise = evaluate();
      await jest.advanceTimersByTimeAsync(60_000);
      const result = await promise;

      expect(result.score).toBeCloseTo(7.5);
      expect(queryMock()).toHaveBeenCalledTimes(3);
      expect(queryMock().mock.calls[2][0].query).not.toContain('cache_read');
    });

    it('keeps an unknown column that is not cache_read a hard failure', async () => {
      queryMock().mockRejectedValue(
        new Error('verification_exception: Unknown column [typo_column]')
      );

      const promise = evaluate();
      await jest.advanceTimersByTimeAsync(300_000);
      const result = await promise;

      expect(result.label).toBe('error');
      // Only the main query runs; the fallback is never reached for an unrelated column.
      expect(queryMock()).toHaveBeenCalledTimes(6);
      expect(mockLog.error).toHaveBeenCalled();
    });
  });
});

describe('getModelPrice', () => {
  it('resolves both traced model ids and EIS connector ids', () => {
    expect(getModelPrice(SOL)).toBeDefined();
    expect(getModelPrice('eis-openai-gpt-5-6-sol')).toEqual(getModelPrice(SOL));
  });

  it('returns undefined for unknown models', () => {
    expect(getModelPrice('acme-unreleased-model')).toBeUndefined();
    expect(getModelPrice('constructor')).toBeUndefined();
    expect(getModelPrice(undefined)).toBeUndefined();
  });
});

describe('getTokenRates', () => {
  it('switches to the long-context rates at the threshold', () => {
    const price = priceOf(SOL);

    expect(getTokenRates(price, 0).input).toBe(7.5);
    expect(getTokenRates(price, 272_000).input).toBe(15);
  });

  it('keeps the base rates for models without a long-context tier', () => {
    expect(getTokenRates(priceOf(FLASH_LITE), 272_000).input).toBe(0.45);
  });
});

describe('estimateCostUsd', () => {
  it('falls back to the input rate when the model has no cache price', () => {
    const usage = { inputTokens: 1_000_000, cachedTokens: 500_000, outputTokens: 0 };

    expect(estimateCostUsd(usage, { input: 2, cachedInput: null, output: 10 })).toBeCloseTo(2);
  });
});
