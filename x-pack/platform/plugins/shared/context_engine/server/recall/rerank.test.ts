/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type {
  InferenceGetResponse,
  InferenceInferenceEndpointInfo,
  InferenceRerankResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { RecallResult } from '../../common/http_api/recall';
import { createRecallReranker } from './rerank';

const TTL_MS = 1000;

const endpoint = (
  inferenceId: string,
  service: string,
  serviceSettings: Record<string, string> = {}
): InferenceInferenceEndpointInfo => ({
  inference_id: inferenceId,
  task_type: 'rerank',
  service,
  service_settings: serviceSettings,
});

const JINA_V3 = endpoint('.jina-reranker-v3', 'elastic');
const JINA_V2 = endpoint('.jina-reranker-v2-base-multilingual', 'elastic');
const EIS_JINA_MODEL = endpoint('.eis-custom', 'elastic', { model_id: 'JINA-Reranker-M0' });
const EIS_OTHER = endpoint('.eis-rerank', 'elastic', { model_id: 'eis-rerank-model' });
const SELF_HOSTED = endpoint('.rerank-v1-elasticsearch', 'elasticsearch');
const COHERE = endpoint('cohere-rerank', 'cohere');
const VOYAGE = endpoint('voyage-rerank', 'voyageai');

const event = (id: string, content = `event ${id}`): RecallResult => ({
  id,
  session_id: 'session-1',
  source: 'session_events',
  date: '2026-11-20T10:00:00.000Z',
  role: 'user',
  content,
});

const memory = (id: string): RecallResult => ({
  id,
  session_id: 'session-1',
  source: 'session_memory',
  date: '2026-11-20T10:00:00.000Z',
  content: `memory ${id}`,
  attributes: { topic: 'checkout' },
});

const aiIndexResult = (id: string): RecallResult => ({
  id,
  source: 'ai_index:runbooks',
  content: `ki ${id}`,
});

const getResponse = (...endpoints: InferenceInferenceEndpointInfo[]): InferenceGetResponse => ({
  endpoints,
});

const rerankResponse = (...indices: number[]): InferenceRerankResponse => ({
  rerank: indices.map((index, rank) => ({ index, relevance_score: 1 - rank / 10 })),
});

const responseError = (statusCode: number): errors.ResponseError =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'error', reason: `status ${statusCode}` } },
    })
  );

const CANDIDATES: readonly RecallResult[] = [event('a'), event('b')];

describe('createRecallReranker', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  let now: number;

  const createReranker = () =>
    createRecallReranker({ esClient, logger, cacheTtlMs: TTL_MS, getNow: () => now });

  const rerankedWith = (call = 0): string | undefined =>
    esClient.inference.rerank.mock.calls[call]?.[0].inference_id;

  beforeEach(() => {
    jest.resetAllMocks();
    now = 0;
    esClient.inference.rerank.mockResolvedValue(rerankResponse(1, 0));
  });

  describe('short-circuit', () => {
    it.each([
      ['no candidates', []],
      ['a single candidate', [event('a')]],
    ])('returns a copy of %s without calling Elasticsearch', async (_, candidates) => {
      const result = await createReranker().rerank({ query: 'q', candidates });

      expect(result).toEqual(candidates);
      expect(result).not.toBe(candidates);
      expect(esClient.inference.get).not.toHaveBeenCalled();
      expect(esClient.inference.rerank).not.toHaveBeenCalled();
    });
  });

  describe('endpoint selection', () => {
    it('discovers every rerank endpoint', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));

      await createReranker().rerank({ query: 'q', candidates: CANDIDATES });

      expect(esClient.inference.get).toHaveBeenCalledWith({
        inference_id: '_all',
        task_type: 'rerank',
      });
    });

    it.each([
      ['Jina v3 over an earlier Jina v2', [JINA_V2, SELF_HOSTED, JINA_V3], JINA_V3],
      ['an EIS Jina endpoint by id', [COHERE, SELF_HOSTED, EIS_OTHER, JINA_V2], JINA_V2],
      [
        'an EIS Jina endpoint by model id',
        [EIS_OTHER, SELF_HOSTED, EIS_JINA_MODEL],
        EIS_JINA_MODEL,
      ],
      ['a non-Jina EIS endpoint over self-hosted', [SELF_HOSTED, EIS_OTHER], EIS_OTHER],
      ['a self-hosted endpoint over third parties', [COHERE, SELF_HOSTED], SELF_HOSTED],
      ['the first third-party endpoint otherwise', [VOYAGE, COHERE], VOYAGE],
    ])('prefers %s', async (_, endpoints, expected) => {
      esClient.inference.get.mockResolvedValue(getResponse(...endpoints));

      await createReranker().rerank({ query: 'q', candidates: CANDIDATES });

      expect(rerankedWith()).toBe(expected.inference_id);
    });

    it('ignores a Jina endpoint that is not served by EIS', async () => {
      esClient.inference.get.mockResolvedValue(
        getResponse(endpoint('jina-direct', 'jinaai'), SELF_HOSTED)
      );

      await createReranker().rerank({ query: 'q', candidates: CANDIDATES });

      expect(rerankedWith()).toBe(SELF_HOSTED.inference_id);
    });

    it('throws when no rerank endpoint exists and retries discovery on the next call', async () => {
      esClient.inference.get.mockResolvedValueOnce(getResponse());
      esClient.inference.get.mockResolvedValueOnce(getResponse(JINA_V3));
      const reranker = createReranker();

      await expect(reranker.rerank({ query: 'q', candidates: CANDIDATES })).rejects.toThrow(
        'No rerank inference endpoint is available in Elasticsearch'
      );
      expect(esClient.inference.rerank).not.toHaveBeenCalled();

      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(rerankedWith()).toBe(JINA_V3.inference_id);
    });
  });

  describe('reranking', () => {
    beforeEach(() => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
    });

    it('sends the query and candidate contents without returning documents', async () => {
      await createReranker().rerank({ query: 'checkout latency', candidates: CANDIDATES });

      expect(esClient.inference.rerank).toHaveBeenCalledWith({
        inference_id: '.jina-reranker-v3',
        query: 'checkout latency',
        input: ['event a', 'event b'],
        return_documents: false,
      });
    });

    it('truncates rerank input to 1,000 characters but returns full results', async () => {
      const long = event('long', 'x'.repeat(1500));
      esClient.inference.rerank.mockResolvedValue(rerankResponse(0, 1));

      const result = await createReranker().rerank({
        query: 'q',
        candidates: [long, event('short')],
      });

      expect(esClient.inference.rerank.mock.calls[0][0].input).toEqual([
        'x'.repeat(1000),
        'event short',
      ]);
      expect(result[0]).toBe(long);
    });

    it('returns mixed candidates in reranked order without mutating the input', async () => {
      const candidates = [event('e'), memory('m'), aiIndexResult('k')];
      const snapshot = [...candidates];
      esClient.inference.rerank.mockResolvedValue(rerankResponse(2, 0, 1));

      const result = await createReranker().rerank({ query: 'q', candidates });

      expect(result).toEqual([candidates[2], candidates[0], candidates[1]]);
      expect(candidates).toEqual(snapshot);
    });

    it('ignores out-of-bounds and duplicate indices', async () => {
      const candidates = [event('a'), event('b'), event('c')];
      esClient.inference.rerank.mockResolvedValue(rerankResponse(1, 3, -1, 1, 0));

      const result = await createReranker().rerank({ query: 'q', candidates });

      expect(result.map(({ id }) => id)).toEqual(['b', 'a']);
    });
  });

  describe('endpoint cache', () => {
    it('reuses the discovered endpoint within the TTL', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
      const reranker = createReranker();

      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      now = TTL_MS - 1;
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });

      expect(esClient.inference.get).toHaveBeenCalledTimes(1);
      expect(esClient.inference.rerank).toHaveBeenCalledTimes(2);
    });

    it('rediscovers once the TTL has elapsed', async () => {
      esClient.inference.get.mockResolvedValueOnce(getResponse(SELF_HOSTED));
      esClient.inference.get.mockResolvedValueOnce(getResponse(JINA_V3));
      const reranker = createReranker();

      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      now = TTL_MS;
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });

      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(rerankedWith(1)).toBe(JINA_V3.inference_id);
    });

    it('shares one discovery between concurrent calls on a cold or expired cache', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
      const reranker = createReranker();

      await Promise.all([
        reranker.rerank({ query: 'q', candidates: CANDIDATES }),
        reranker.rerank({ query: 'q', candidates: CANDIDATES }),
      ]);
      expect(esClient.inference.get).toHaveBeenCalledTimes(1);

      now = TTL_MS;
      await Promise.all([
        reranker.rerank({ query: 'q', candidates: CANDIDATES }),
        reranker.rerank({ query: 'q', candidates: CANDIDATES }),
      ]);
      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(esClient.inference.rerank).toHaveBeenCalledTimes(4);
    });

    it('does not cache discovery failures', async () => {
      const unavailable = responseError(503);
      esClient.inference.get.mockRejectedValueOnce(unavailable);
      esClient.inference.get.mockResolvedValueOnce(getResponse(JINA_V3));
      const reranker = createReranker();

      await expect(reranker.rerank({ query: 'q', candidates: CANDIDATES })).rejects.toBe(
        unavailable
      );
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });

      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(rerankedWith()).toBe(JINA_V3.inference_id);
    });
  });

  describe('rerank failures', () => {
    it('rediscovers and retries once when a cached endpoint is gone', async () => {
      esClient.inference.get.mockResolvedValueOnce(getResponse(JINA_V3));
      esClient.inference.get.mockResolvedValueOnce(getResponse(SELF_HOSTED));
      const reranker = createReranker();
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      esClient.inference.rerank.mockRejectedValueOnce(responseError(404));

      const result = await reranker.rerank({ query: 'q', candidates: CANDIDATES });

      expect(result.map(({ id }) => id)).toEqual(['b', 'a']);
      expect(logger.debug).toHaveBeenCalled();
      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(rerankedWith(1)).toBe(JINA_V3.inference_id);
      expect(rerankedWith(2)).toBe(SELF_HOSTED.inference_id);

      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(rerankedWith(3)).toBe(SELF_HOSTED.inference_id);
    });

    it('rethrows without retrying when rediscovery returns the same cached endpoint', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
      const reranker = createReranker();
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      const notFound = responseError(404);
      esClient.inference.rerank.mockRejectedValueOnce(notFound);

      await expect(reranker.rerank({ query: 'q', candidates: CANDIDATES })).rejects.toBe(notFound);

      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
      expect(esClient.inference.rerank).toHaveBeenCalledTimes(2);
    });

    it('clears the cache and rethrows when a freshly discovered endpoint is gone', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
      const notFound = responseError(404);
      esClient.inference.rerank.mockRejectedValueOnce(notFound);
      const reranker = createReranker();

      await expect(reranker.rerank({ query: 'q', candidates: CANDIDATES })).rejects.toBe(notFound);
      expect(esClient.inference.get).toHaveBeenCalledTimes(1);
      expect(esClient.inference.rerank).toHaveBeenCalledTimes(1);

      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      expect(esClient.inference.get).toHaveBeenCalledTimes(2);
    });

    it('propagates other rerank errors and keeps the cached endpoint', async () => {
      esClient.inference.get.mockResolvedValue(getResponse(JINA_V3));
      const reranker = createReranker();
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });
      const unavailable = responseError(503);
      esClient.inference.rerank.mockRejectedValueOnce(unavailable);

      await expect(reranker.rerank({ query: 'q', candidates: CANDIDATES })).rejects.toBe(
        unavailable
      );
      await reranker.rerank({ query: 'q', candidates: CANDIDATES });

      expect(esClient.inference.get).toHaveBeenCalledTimes(1);
      expect(esClient.inference.rerank).toHaveBeenCalledTimes(3);
    });
  });
});
