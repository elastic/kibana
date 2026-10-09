/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { filterReadableAiIndices, probeAiIndices } from './filter_readable_ai_indices';

const aiIndex = (id: string, target = `ai-index-idx-${id}`): AiIndexHttpItem => ({
  id,
  dest: { type: 'index', value: target },
  managed: false,
  memory_enabled: true,
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
});

const shards = { total: 1, successful: 1, skipped: 0, failed: 0 };
const ok = (extra: Record<string, unknown> = {}) => ({
  timed_out: false,
  _shards: shards,
  hits: { hits: [] },
  ...extra,
});
const failed = (status: number, type: string, reason?: string) => ({
  status,
  error: { type, reason },
});

const msearch = jest.fn();
const esClient = { msearch } as unknown as ElasticsearchClient;
const logger = loggingSystemMock.createLogger();
const params = { esClient, logger };

beforeEach(() => {
  msearch.mockReset();
  logger.debug.mockReset();
});

describe('probeAiIndices', () => {
  it('tells privilege refusals apart from unavailability', async () => {
    msearch.mockResolvedValue({
      responses: [
        ok(),
        failed(403, 'security_exception', 'unauthorized for user'),
        failed(400, 'index_closed_exception'),
        ok({ timed_out: true }),
        ok({ _shards: { ...shards, total: 3, successful: 2, failed: 1 } }),
      ],
    });

    const result = await probeAiIndices({
      ...params,
      aiIndices: ['readable', 'forbidden', 'closed', 'slow', 'degraded'].map((id) => aiIndex(id)),
    });

    expect(result.map((probed) => ({ id: probed.aiIndex.id, failure: probed.failure }))).toEqual([
      { id: 'readable', failure: undefined },
      { id: 'forbidden', failure: { reason: 'unauthorized for user', privilege: true } },
      { id: 'closed', failure: { reason: 'index_closed_exception', privilege: false } },
      { id: 'slow', failure: { reason: 'timed out', privilege: false } },
      { id: 'degraded', failure: { reason: '1 shard(s) failed', privilege: false } },
    ]);
  });
});

describe('filterReadableAiIndices', () => {
  it('skips Elasticsearch when there is nothing to check', async () => {
    expect(await filterReadableAiIndices({ ...params, aiIndices: [] })).toEqual([]);
    expect(msearch).not.toHaveBeenCalled();
  });

  it('sends one probe per AI Index in one msearch', async () => {
    msearch.mockResolvedValue({ responses: [ok(), ok()] });

    await filterReadableAiIndices({
      ...params,
      aiIndices: [aiIndex('a'), aiIndex('b', 'ai-index-ds-b')],
    });

    const header = (index: string) => ({ index, allow_partial_search_results: false });
    const body = {
      size: 0,
      terminate_after: 1,
      track_total_hits: false,
      query: { match_all: {} },
    };
    expect(msearch).toHaveBeenCalledTimes(1);
    expect(msearch).toHaveBeenCalledWith({
      searches: [header('ai-index-idx-a'), body, header('ai-index-ds-b'), body],
    });
  });

  it('keeps readable and not-yet-created indices and drops the rest', async () => {
    msearch.mockResolvedValue({
      responses: [
        ok(), // readable
        failed(404, 'index_not_found_exception', 'no such index [ai-index-idx-missing]'), // not created yet
        failed(403, 'security_exception', 'unauthorized for user'),
        failed(400, 'index_closed_exception'),
        ok({ timed_out: true }),
        ok({ _shards: { ...shards, total: 3, successful: 2, failed: 1 } }),
      ],
    });

    const result = await filterReadableAiIndices({
      ...params,
      aiIndices: ['readable', 'missing', 'forbidden', 'closed', 'slow', 'degraded'].map((id) =>
        aiIndex(id)
      ),
    });

    expect(result.map(({ id }) => id)).toEqual(['readable', 'missing']);
    expect(logger.debug.mock.calls.map(([message]) => message)).toEqual([
      "AI index 'forbidden' is not readable: unauthorized for user",
      "AI index 'closed' is not readable: index_closed_exception",
      "AI index 'slow' is not readable: timed out",
      "AI index 'degraded' is not readable: 1 shard(s) failed",
    ]);
  });

  // Elasticsearch refuses the whole `msearch` for a caller with no search privilege anywhere.
  it('propagates the 403 when the request itself is rejected as unauthorized', async () => {
    msearch.mockRejectedValue(
      new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 403,
          body: { error: { type: 'security_exception' } },
        })
      )
    );

    await expect(filterReadableAiIndices({ ...params, aiIndices: [aiIndex('a')] })).rejects.toThrow(
      'security_exception'
    );
  });

  // `existing,missing` is a 404 as a whole, so it says nothing about `existing`.
  it('does not trust not-found for comma-separated targets', async () => {
    msearch.mockResolvedValue({
      responses: [failed(404, 'index_not_found_exception', 'no such index [ai-index-idx-missing]')],
    });

    const result = await filterReadableAiIndices({
      ...params,
      aiIndices: [aiIndex('list', 'ai-index-idx-existing,ai-index-idx-missing')],
    });

    expect(result).toEqual([]);
  });

  it('propagates a failed msearch request', async () => {
    msearch.mockRejectedValue(new Error('unavailable'));

    await expect(filterReadableAiIndices({ ...params, aiIndices: [aiIndex('a')] })).rejects.toThrow(
      'unavailable'
    );
  });
});
