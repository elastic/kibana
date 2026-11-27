/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { assertAiIndicesWritable } from './assert_ai_indices_writable';
import { AiIndexNotFoundError, AiIndexWriteForbiddenError } from './errors';

const makeAiIndex = (id: string, destValue = `ai-index-ds-${id}`): AiIndexItem =>
  ({
    id,
    dest: { type: 'data_stream', value: destValue },
  } as AiIndexItem);

describe('assertAiIndicesWritable', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const aiIndexService = {
    get: jest.fn<Promise<AiIndexItem>, [string, string]>(),
  };

  beforeEach(() => {
    esClient.security.hasPrivileges.mockReset();
    aiIndexService.get.mockReset();
  });

  it('does nothing when aiIndexIds is empty', async () => {
    await assertAiIndicesWritable({
      aiIndexService,
      esClient,
      spaceId: 'default',
      aiIndexIds: [],
    });

    expect(aiIndexService.get).not.toHaveBeenCalled();
    expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('deduplicates AI index ids and shared backing destinations', async () => {
    aiIndexService.get.mockImplementation(async (id) => makeAiIndex(id, 'ai-index-ds-shared'));
    esClient.security.hasPrivileges.mockResolvedValueOnce({
      index: { 'ai-index-ds-shared': { write: true } },
    } as never);

    await assertAiIndicesWritable({
      aiIndexService,
      esClient,
      spaceId: 'marketing',
      aiIndexIds: ['ops', 'sales', 'ops'],
    });

    expect(aiIndexService.get.mock.calls).toEqual([
      ['ops', 'marketing'],
      ['sales', 'marketing'],
    ]);
    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['ai-index-ds-shared'], privileges: ['write'] }],
    });
  });

  it('propagates AiIndexNotFoundError without calling hasPrivileges', async () => {
    aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('missing'));

    await expect(
      assertAiIndicesWritable({
        aiIndexService,
        esClient,
        spaceId: 'default',
        aiIndexIds: ['missing'],
      })
    ).rejects.toThrow("AI index 'missing' not found");
    expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('throws AiIndexWriteForbiddenError when write is false or omitted from hasPrivileges', async () => {
    aiIndexService.get.mockImplementation(async (id) => makeAiIndex(id));
    esClient.security.hasPrivileges.mockResolvedValueOnce({
      index: { 'ai-index-ds-ops': { write: true } },
    } as never);

    await expect(
      assertAiIndicesWritable({
        aiIndexService,
        esClient,
        spaceId: 'default',
        aiIndexIds: ['ops', 'sales'],
      })
    ).rejects.toThrow(AiIndexWriteForbiddenError);
  });
});
