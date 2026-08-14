/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexService } from '../ai_indices/service';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { getUpdateKiStepDefinition } from './update_ki';
import { createMockStepContext, mockAiIndexService } from './test_utils';

const searchHit = (index: string) => ({ hits: { hits: [{ _id: 'ki-1', _index: index }] } });

const enabled = async () => true;

describe('getUpdateKiStepDefinition', () => {
  it('throws FeatureDisabledError when Context Engine is disabled', async () => {
    const esClient = { search: jest.fn(), update: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: async () => false,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('updates the KI in its backing index and returns the result', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { description: 'Updated' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'data_stream', value: 'ai-index-ds-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'updated' } });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        index: 'ai-index-ds-my-ai-index',
        query: { ids: { values: ['ki-1'] } },
        size: 1,
        _source: false,
      },
      { signal: context.abortSignal }
    );
    expect(esClient.update).toHaveBeenCalledWith(
      {
        index: '.ds-ai-index-ds-my-ai-index-000001',
        id: 'ki-1',
        doc: { description: 'Updated' },
        refresh: 'wait_for',
      },
      { signal: context.abortSignal }
    );
  });

  it('returns noop when the update did not change the document', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'noop' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: {} },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'noop' } });
  });

  it('throws NotFoundError when the KI does not exist in the AI index', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the AI index does not exist', async () => {
    const esClient = { search: jest.fn(), update: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'missing', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = {
      get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('missing')),
    } as unknown as AiIndexService;

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
