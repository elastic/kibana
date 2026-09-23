/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { assertReadableAiIndex } from './assert_readable_ai_index';
import { AiIndexNotReadableError } from './errors';

const aiIndex = (target: string): AiIndexHttpItem => ({
  id: 'support',
  dest: { type: 'index', value: target },
  managed: false,
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
const failed = (type: string, reason?: string) => ({ status: 403, error: { type, reason } });

describe('assertReadableAiIndex', () => {
  const msearch = jest.fn();
  const esClient = { msearch } as unknown as ElasticsearchClient;

  beforeEach(() => {
    msearch.mockReset();
  });

  it('probes the backing store as the caller and resolves when it is readable', async () => {
    msearch.mockResolvedValue({ responses: [ok()] });

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).resolves.toBeUndefined();

    expect(msearch).toHaveBeenCalledTimes(1);
    expect(msearch).toHaveBeenCalledWith({
      searches: [
        { index: 'ai-index-idx-support', allow_partial_search_results: false },
        { size: 0, terminate_after: 1, track_total_hits: false, query: { match_all: {} } },
      ],
    });
  });

  it('throws with the Elasticsearch reason when the caller cannot read the backing store', async () => {
    msearch.mockResolvedValue({
      responses: [
        failed('security_exception', 'action [indices:data/read/search] is unauthorized'),
      ],
    });

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).rejects.toThrow(
      new AiIndexNotReadableError('support', 'action [indices:data/read/search] is unauthorized')
    );
  });

  it.each([
    ['a closed index', failed('index_closed_exception')],
    ['a timeout', ok({ timed_out: true })],
    ['a failed shard', ok({ _shards: { ...shards, total: 3, successful: 2, failed: 1 } })],
  ])('throws when the probe cannot be trusted: %s', async (_label, response) => {
    msearch.mockResolvedValue({ responses: [response] });

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).rejects.toThrow(AiIndexNotReadableError);
  });

  // The entry may have just been registered, so its backing store counts as readable.
  it('resolves when a single-expression target does not exist yet', async () => {
    msearch.mockResolvedValue({
      responses: [failed('index_not_found_exception', 'no such index [ai-index-idx-support]')],
    });

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).resolves.toBeUndefined();
  });

  // `existing,missing` is a 404 as a whole, so it says nothing about `existing`.
  it('does not trust not-found for a comma-separated target', async () => {
    msearch.mockResolvedValue({
      responses: [failed('index_not_found_exception', 'no such index [ai-index-idx-missing]')],
    });

    await expect(
      assertReadableAiIndex({
        esClient,
        aiIndex: aiIndex('ai-index-idx-support,ai-index-idx-missing'),
      })
    ).rejects.toThrow(AiIndexNotReadableError);
  });

  // Elasticsearch may refuse the whole `msearch` rather than the probe item inside it.
  it('throws when the request itself is rejected as unauthorized', async () => {
    msearch.mockRejectedValue(
      new errors.ResponseError(
        elasticsearchClientMock.createApiResponse({
          statusCode: 403,
          body: { error: { type: 'security_exception' } },
        })
      )
    );

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).rejects.toThrow(AiIndexNotReadableError);
  });

  it('propagates a failed msearch request', async () => {
    msearch.mockRejectedValue(new Error('unavailable'));

    await expect(
      assertReadableAiIndex({ esClient, aiIndex: aiIndex('ai-index-idx-support') })
    ).rejects.toThrow('unavailable');
  });
});
