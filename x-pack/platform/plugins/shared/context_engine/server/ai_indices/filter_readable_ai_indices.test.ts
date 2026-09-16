/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { filterReadableAiIndices } from './filter_readable_ai_indices';

const aiIndex = (id: string, target = `ai-index-idx-${id}`): AiIndexHttpItem => ({
  id,
  dest: { type: 'index', value: target },
  managed: false,
  automations: [],
  sources: [],
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
const failed = (type: string, reason?: string) => ({ status: 403, error: { type, reason } });

describe('filterReadableAiIndices', () => {
  const msearch = jest.fn();
  const esClient = { msearch } as unknown as ElasticsearchClient;
  const logger = loggingSystemMock.createLogger();
  const params = { esClient, logger };

  beforeEach(() => {
    msearch.mockReset();
    logger.debug.mockReset();
  });

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
        failed('index_not_found_exception', 'no such index [ai-index-idx-missing]'), // not created yet
        failed('security_exception', 'unauthorized for user'),
        failed('index_closed_exception'),
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
      "AI index 'forbidden' left out of the list: unauthorized for user",
      "AI index 'closed' left out of the list: index_closed_exception",
      "AI index 'slow' left out of the list: timed out",
      "AI index 'degraded' left out of the list: 1 shard(s) failed",
    ]);
  });

  // `existing,missing` is a 404 as a whole, so it says nothing about `existing`.
  it('does not trust not-found for comma-separated targets', async () => {
    msearch.mockResolvedValue({
      responses: [failed('index_not_found_exception', 'no such index [ai-index-idx-missing]')],
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
