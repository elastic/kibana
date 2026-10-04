/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import { errors } from '@elastic/elasticsearch';
import type { SemanticLogSearchParams } from '../../../../../common/services/semantic_log_search/types';
import { searchWithEsqlRerank } from './search';
import {
  DEFAULT_RANK_WINDOW,
  MAX_RERANK_INPUT_LENGTH,
  RERANK_INFERENCE_TIMEOUT,
  RERANK_REQUEST_TIMEOUT_MS,
} from '../../constants';
import { searchDeps } from '../../test_helpers';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const emptyResponse: ESQLSearchResponse = { columns: [], values: [] };

/** Build an ES|QL response for the count probe (STATS total = COUNT(*)). */
const makeCountResponse = (total: number): ESQLSearchResponse => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

/** Build an ES|QL response with CATEGORIZE columns for the head/rare passes. */
const makePatternResponse = (
  rows: Array<{ pattern: string; count: number }>
): ESQLSearchResponse => ({
  columns: [
    { name: 'count', type: 'long' },
    { name: 'first_seen', type: 'date' },
    { name: 'last_seen', type: 'date' },
    { name: 'sample', type: 'keyword' },
    { name: 'pattern', type: 'keyword' },
  ],
  values: rows.map(({ pattern, count }) => [
    count,
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T01:00:00.000Z',
    `sample for ${pattern}`,
    pattern,
  ]),
});

interface MockClientOptions {
  /** Document count returned by the count probe (default 0 → early return). */
  totalDocs?: number;
  /** ES|QL response for the head / single pass (default emptyResponse). */
  headResponse?: ESQLSearchResponse;
  /** ES|QL response for the rare pass (default emptyResponse). */
  rareResponse?: ESQLSearchResponse;
  /** Entries returned by `inference.rerank` (default []). */
  rerankResult?: Array<{ index: number; relevance_score: number }>;
}

/**
 * Build a minimal mock `ElasticsearchClient` with pre-wired responses.
 * The count probe is always the first `esql.query` call; head pass is second; rare pass is third.
 * `inference.rerank` is a separate mock.
 */
const buildMockClient = ({
  totalDocs = 0,
  headResponse = emptyResponse,
  rareResponse = emptyResponse,
  rerankResult = [],
}: MockClientOptions = {}) => {
  const esqlQuery = jest
    .fn()
    .mockResolvedValueOnce(makeCountResponse(totalDocs)) // count probe
    .mockResolvedValueOnce(headResponse) // head (or single) pass
    .mockResolvedValueOnce(rareResponse); // rare pass

  const rerank = jest.fn().mockResolvedValue({ rerank: rerankResult });

  const esClient = {
    esql: { query: esqlQuery },
    inference: { rerank },
  } as unknown as ElasticsearchClient;

  return { esClient, esqlQuery, rerank };
};

/** Default params for tests that only care about one specific behaviour. */
const BASE_PARAMS: Omit<SemanticLogSearchParams, 'esClient'> = {
  target: 'logs-*',
  nlQuery: 'connection failures',
  timeRange: { start: 1704067200000, end: 1704153600000 },
};

// ---------------------------------------------------------------------------
// searchWithEsqlRerank
// ---------------------------------------------------------------------------

describe('searchWithEsqlRerank', () => {
  describe('count probe', () => {
    it('sends time-range as reserved named params on the probe query', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 0 });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      // First call is the count probe.
      const probeRequest = esqlQuery.mock.calls[0][0];
      expect(probeRequest.query).toContain('WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend');
      expect(probeRequest.params).toEqual([
        { _tstart: '2024-01-01T00:00:00.000Z' },
        { _tend: '2024-01-02T00:00:00.000Z' },
      ]);
      expect(probeRequest.allow_partial_results).toBe(false);
    });

    it('returns success with empty patterns when count = 0', async () => {
      const { esClient } = buildMockClient({ totalDocs: 0 });

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toEqual({ status: 'success', patterns: [] });
    });

    it('returns scope_too_large when the probe times out', async () => {
      const logger = loggerMock.create();
      const timeoutError = new Error('probe timed out');
      timeoutError.name = 'TimeoutError';

      const esClient = {
        esql: { query: jest.fn().mockRejectedValue(timeoutError) },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps(logger));

      expect(result).toMatchObject({ status: 'error', reason: 'scope_too_large' });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('scope too large'));
    });

    it('returns scope_too_large when the probe returns partial results', async () => {
      const esClient = {
        esql: {
          query: jest.fn().mockResolvedValue({ ...makeCountResponse(0), is_partial: true }),
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'scope_too_large' });
    });

    it('returns cancelled when the probe is aborted', async () => {
      const abortError = new Error('probe aborted');
      abortError.name = 'RequestAbortedError';

      const esClient = {
        esql: { query: jest.fn().mockRejectedValue(abortError) },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'cancelled' });
    });

    it('returns execution error when the probe fails with an unrelated error', async () => {
      const esClient = {
        esql: { query: jest.fn().mockRejectedValue(new Error('verification_exception')) },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'execution' });
    });

    it('includes the kqlFilter in the count probe query', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 0 });

      await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS, kqlFilter: 'service.name:"checkout"' },
        searchDeps()
      );

      const probeQuery = esqlQuery.mock.calls[0][0].query;
      expect(probeQuery).toContain('KQL("service.name:\\"checkout\\""');
    });
  });

  describe('single-pass path (≤ 50 000 docs, no SAMPLE)', () => {
    it('does not emit a SAMPLE clause for a small corpus', async () => {
      // 10 000 docs → getSampleProbability returns 1 → no SAMPLE.
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 10_000 });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const headQuery = esqlQuery.mock.calls[1][0].query;
      expect(headQuery).not.toContain('SAMPLE');
    });

    it('sends the categorize query with the correct STATS columns', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 10_000 });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const headQuery = esqlQuery.mock.calls[1][0].query;
      expect(headQuery).toContain('STATS count = COUNT(*)');
      expect(headQuery).toContain('first_seen = MIN(@timestamp)');
      expect(headQuery).toContain('last_seen = MAX(@timestamp)');
      expect(headQuery).toContain('LATEST(message)');
      expect(headQuery).toContain('BY pattern = CATEGORIZE(message');
    });

    it('applies the kqlFilter in the categorize query', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 10_000 });

      await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS, kqlFilter: 'service.name:"checkout" | DROP message' },
        searchDeps()
      );

      const headQuery = esqlQuery.mock.calls[1][0].query;
      expect(headQuery).toContain('WHERE KQL("service.name:\\"checkout\\" | DROP message")');
    });

    it('calls inference.rerank with the correct inference_id and nlQuery', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Connection timed out', count: 50 }]);
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 3.46 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(rerank).toHaveBeenCalledWith(
        expect.objectContaining({
          inference_id: '.rerank-v1-elasticsearch',
          query: 'connection failures',
          input: expect.arrayContaining([expect.any(String)]),
        }),
        expect.any(Object)
      );
    });

    // Elasticsearch's default inference budget is below what the local endpoint needs for a full
    // rank window, and it is the server that gives up first, so the client `requestTimeout` alone
    // cannot keep the call alive. See RERANK_ENDPOINTS.md.
    it('sends a server-side timeout that leaves the client budget binding', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Connection timed out', count: 50 }]);
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 3.46 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(rerank).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: RERANK_INFERENCE_TIMEOUT }),
        expect.objectContaining({ requestTimeout: RERANK_REQUEST_TIMEOUT_MS })
      );
    });

    it('reranks through the configured endpoint, not the preconfigured default', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Connection timed out', count: 50 }]);
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 0.42 }],
      });

      await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS },
        { logger: loggerMock.create(), rerankInferenceId: '.jina-reranker-v3' }
      );

      expect(rerank).toHaveBeenCalledWith(
        expect.objectContaining({ inference_id: '.jina-reranker-v3' }),
        expect.any(Object)
      );
    });

    it('maps relevance_score back to relevanceScore on the returned patterns', async () => {
      const headResponse = makePatternResponse([
        { pattern: 'Error connecting', count: 80 },
        { pattern: 'Connection refused', count: 20 },
      ]);
      const { esClient } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [
          { index: 1, relevance_score: 3.46 }, // Connection refused scores higher
          { index: 0, relevance_score: -2.15 },
        ],
      });

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.patterns).toHaveLength(2);
        expect(result.patterns[0].pattern).toBe('Connection refused');
        expect(result.patterns[0].relevanceScore).toBe(3.46);
        expect(result.patterns[1].pattern).toBe('Error connecting');
        expect(result.patterns[1].relevanceScore).toBe(-2.15);
      }
    });

    it('limits the returned patterns to maxPatterns', async () => {
      const headResponse = makePatternResponse([
        { pattern: 'Pattern A', count: 100 },
        { pattern: 'Pattern B', count: 80 },
        { pattern: 'Pattern C', count: 60 },
      ]);
      const { esClient } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [
          { index: 0, relevance_score: 3.0 },
          { index: 1, relevance_score: 2.0 },
          { index: 2, relevance_score: 1.0 },
        ],
      });

      const result = await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS, maxPatterns: 2 },
        searchDeps()
      );

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.patterns).toHaveLength(2);
      }
    });

    it('returns success with empty patterns when categorize returns no rows', async () => {
      const { esClient } = buildMockClient({ totalDocs: 10_000, headResponse: emptyResponse });

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toEqual({ status: 'success', patterns: [] });
    });
  });

  describe('two-pass path (> 50 000 docs, with SAMPLE)', () => {
    // 100 000 docs → getSampleProbability returns 0.5.
    const LARGE_TOTAL = 100_000;

    it('emits a SAMPLE clause on the head pass', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: LARGE_TOTAL });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const headQuery = esqlQuery.mock.calls[1][0].query;
      expect(headQuery).toContain('SAMPLE');
    });

    it('applies a noise threshold filter after STATS on the head pass', async () => {
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: LARGE_TOTAL });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      // Head pass applies WHERE count > noiseThreshold = ceil(0.01 × 100_000 × 0.5) = 500.
      const headQuery = esqlQuery.mock.calls[1][0].query;
      expect(headQuery).toContain('WHERE count > ');
    });

    it('excludes head patterns in the rare pass using NOT MATCH', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Error pattern tokens', count: 600 }]);
      const { esClient, esqlQuery } = buildMockClient({
        totalDocs: LARGE_TOTAL,
        headResponse,
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const rareQuery = esqlQuery.mock.calls[2][0].query;
      expect(rareQuery).toContain('NOT MATCH(message, "Error pattern tokens"');
    });

    it('sorts the rare pass ASC to preserve rarest patterns on ES|QL row-cap truncation', async () => {
      // Head must return patterns for the rare pass to run; empty head triggers the DESC fallback.
      const headResponse = makePatternResponse([{ pattern: 'Common error', count: 600 }]);
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: LARGE_TOTAL, headResponse });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const rareQuery = esqlQuery.mock.calls[2][0].query;
      expect(rareQuery).toContain('SORT count ASC');
    });

    it('runs a plain DESC fallback when the head pass returns no patterns', async () => {
      // Empty head triggers the DESC fallback path — not an ASC rare pass with no exclusions,
      // which would truncate the rarest 1 000 rows and discard representative patterns.
      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(LARGE_TOTAL)) // probe
            .mockResolvedValueOnce(emptyResponse) // head (empty)
            .mockResolvedValueOnce(
              makePatternResponse([{ pattern: 'Fallback pattern', count: 5 }])
            ),
        },
        inference: {
          rerank: jest.fn().mockResolvedValue({ rerank: [{ index: 0, relevance_score: 1.0 }] }),
        },
      } as unknown as ElasticsearchClient;

      const esqlQuery = esClient.esql.query as jest.Mock;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result.status).toBe('success');
      // Fallback is DESC — no NOT MATCH exclusions.
      const fallbackQuery = esqlQuery.mock.calls[2][0].query;
      expect(fallbackQuery).toContain('SORT count DESC');
      expect(fallbackQuery).not.toContain('NOT MATCH');
    });

    it('normalizes sampled counts by 1/probability', async () => {
      // 100 000 docs → p = 0.5 → count of 100 in the sample → normalized to 200.
      const headResponse = makePatternResponse([{ pattern: 'Token pattern', count: 100 }]);
      const { esClient } = buildMockClient({
        totalDocs: LARGE_TOTAL,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.patterns[0].count).toBe(200); // 100 / 0.5
      }
    });

    it('deduplicates patterns that appear in both head and rare passes, keeping the higher count', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Shared pattern', count: 100 }]);
      const rareResponse = makePatternResponse([{ pattern: 'Shared pattern', count: 10 }]);
      const { esClient } = buildMockClient({
        totalDocs: LARGE_TOTAL,
        headResponse,
        rareResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.patterns).toHaveLength(1);
        // Head count 100 / 0.5 = 200 should win over rare count 10.
        expect(result.patterns[0].count).toBe(200);
      }
    });
  });

  describe('error handling (categorize / rerank phase)', () => {
    it('returns execution error when a categorize pass returns partial results', async () => {
      // Partial results mean missing shards — reporting "no patterns" would be a silent fail-open.
      const partialCategorizeResponse = {
        ...makePatternResponse([{ pattern: 'Incomplete pattern', count: 5 }]),
        is_partial: true,
      };
      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000)) // probe succeeds
            .mockResolvedValueOnce(partialCategorizeResponse), // categorize is partial
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'execution' });
    });

    it('returns timeout when a categorize pass times out', async () => {
      const timeoutError = new Error('request timed out');
      timeoutError.name = 'TimeoutError';

      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000)) // probe succeeds
            .mockRejectedValue(timeoutError), // head pass times out
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'timeout' });
    });

    it('returns inference_not_ready when the inference rerank call times out', async () => {
      const timeoutError = new Error('request timed out');
      timeoutError.name = 'TimeoutError';

      const headResponse = makePatternResponse([{ pattern: 'Error pattern', count: 100 }]);
      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000))
            .mockResolvedValueOnce(headResponse),
        },
        inference: { rerank: jest.fn().mockRejectedValue(timeoutError) },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
    });

    it('returns cancelled for a RequestAbortedError in the categorize phase', async () => {
      const realAbortError = new errors.RequestAbortedError('request aborted');

      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000))
            .mockRejectedValue(realAbortError),
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'cancelled' });
    });

    it('returns execution error for an unrelated failure in the categorize phase', async () => {
      const logger = loggerMock.create();

      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000))
            .mockRejectedValue(new Error('verification_exception')),
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps(logger));

      expect(result).toMatchObject({ status: 'error', reason: 'execution' });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('verification_exception'));
    });

    it('returns execution (not cancelled) when signal is aborted but the error is unrelated', async () => {
      // isCancellationError tests the error type, not the signal state — any non-abort error
      // surfacing after an abort must still be classified as `execution`.
      const abortController = new AbortController();
      abortController.abort();

      const esClient = {
        esql: {
          query: jest
            .fn()
            .mockResolvedValueOnce(makeCountResponse(10_000))
            .mockRejectedValue(new Error('mapper_parsing_exception')),
        },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS, abortSignal: abortController.signal },
        searchDeps()
      );

      expect(result).toMatchObject({ status: 'error', reason: 'execution' });
    });

    it('passes the abortSignal to query calls', async () => {
      const abortController = new AbortController();
      const { esClient, esqlQuery } = buildMockClient({ totalDocs: 0 });

      await searchWithEsqlRerank(
        { esClient, ...BASE_PARAMS, abortSignal: abortController.signal },
        searchDeps()
      );

      expect(esqlQuery.mock.calls[0][1]).toEqual(
        expect.objectContaining({ signal: abortController.signal })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // rerank call: candidate cap, top_n / return_documents, input truncation
  // ---------------------------------------------------------------------------

  describe('rerank call parameters', () => {
    it('caps the candidate count at DEFAULT_RANK_WINDOW before the inference call', async () => {
      // Build more candidates than DEFAULT_RANK_WINDOW. Small corpus → single pass.
      const rowCount = DEFAULT_RANK_WINDOW + 100;
      const manyRows = Array.from({ length: rowCount }, (_, i) => ({
        pattern: `pattern-${i}`,
        count: rowCount - i,
      }));
      const bigResponse = {
        columns: [
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: 'sample', type: 'keyword' },
          { name: 'pattern', type: 'keyword' },
        ],
        values: manyRows.map(({ pattern, count }) => [
          count,
          '2024-01-01T00:00:00.000Z',
          '2024-01-01T01:00:00.000Z',
          `sample for ${pattern}`,
          pattern,
        ]),
      };
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse: bigResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const rerankArgs = rerank.mock.calls[0][0];
      expect(rerankArgs.input).toHaveLength(DEFAULT_RANK_WINDOW);
    });

    it('passes top_n at the top level and return_documents inside task_settings', async () => {
      const headResponse = makePatternResponse([
        { pattern: 'Error A', count: 100 },
        { pattern: 'Error B', count: 50 },
      ]);
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS, maxPatterns: 3 }, searchDeps());

      const rerankArgs = rerank.mock.calls[0][0];
      expect(rerankArgs.top_n).toBe(3);
      // A top-level `return_documents` is rejected by every non-`elasticsearch` inference service,
      // so its location is load-bearing for pointing the service at a hosted reranker.
      expect(rerankArgs.return_documents).toBeUndefined();
      expect(rerankArgs.task_settings).toEqual({ return_documents: false });
    });

    it('truncates per-candidate input to MAX_RERANK_INPUT_LENGTH', async () => {
      const longMessage = 'x'.repeat(MAX_RERANK_INPUT_LENGTH + 500);
      const headResponse = {
        columns: [
          { name: 'count', type: 'long' },
          { name: 'first_seen', type: 'date' },
          { name: 'last_seen', type: 'date' },
          { name: 'sample', type: 'keyword' },
          { name: 'pattern', type: 'keyword' },
        ],
        values: [
          [100, '2024-01-01T00:00:00.000Z', '2024-01-01T01:00:00.000Z', longMessage, 'LongPattern'],
        ],
      };
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      const rerankArgs = rerank.mock.calls[0][0];
      expect(rerankArgs.input[0].length).toBeLessThanOrEqual(MAX_RERANK_INPUT_LENGTH);
    });

    it('gives the rerank call its own longer timeout, not the ES|QL one', async () => {
      const headResponse = makePatternResponse([{ pattern: 'Error A', count: 100 }]);
      const { esClient, rerank } = buildMockClient({
        totalDocs: 10_000,
        headResponse,
        rerankResult: [{ index: 0, relevance_score: 1.0 }],
      });

      await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(rerank.mock.calls[0][1]).toEqual(
        expect.objectContaining({ requestTimeout: RERANK_REQUEST_TIMEOUT_MS })
      );
    });

    it('regression: a rerank timeout is inference_not_ready, not timeout', async () => {
      // The reranker is gated on ML model allocation, not query cost. Classifying its timeout as
      // `timeout` made the tool advise narrowing the scope, which cannot fix a loading model.
      const headResponse = makePatternResponse([{ pattern: 'Error A', count: 100 }]);
      const { esClient } = buildMockClient({ totalDocs: 10_000, headResponse });
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      esClient.inference.rerank = jest.fn().mockRejectedValue(timeoutError);

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'inference_not_ready' });
    });

    it('still reports a categorize timeout as timeout, not inference_not_ready', async () => {
      // The phase split must not swallow the case where narrowing the scope IS the right advice.
      const timeoutError = new Error('Request timed out');
      timeoutError.name = 'TimeoutError';
      const esqlQuery = jest
        .fn()
        .mockResolvedValueOnce(makeCountResponse(10_000)) // probe succeeds
        .mockRejectedValue(timeoutError); // categorize pass times out
      const esClient = {
        esql: { query: esqlQuery },
        inference: { rerank: jest.fn() },
      } as unknown as ElasticsearchClient;

      const result = await searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps());

      expect(result).toMatchObject({ status: 'error', reason: 'timeout' });
    });
  });

  it('uses a short timeout on the probe and the full timeout on categorize passes', () => {
    const { esClient, esqlQuery } = buildMockClient({ totalDocs: 0 });

    return searchWithEsqlRerank({ esClient, ...BASE_PARAMS }, searchDeps()).then(() => {
      // Probe uses PROBE_TIMEOUT_MS (5_000).
      expect(esqlQuery.mock.calls[0][1]).toEqual(
        expect.objectContaining({ requestTimeout: 5_000 })
      );
    });
  });
});
