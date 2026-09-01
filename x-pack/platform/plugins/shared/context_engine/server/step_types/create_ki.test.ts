/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexService } from '../ai_indices/service';
import { AiIndexAlreadyExistsError, AiIndexNotFoundError } from '../ai_indices/errors';
import { getCreateKiStepDefinition } from './create_ki';
import { createMockStepContext, mockAiIndexService } from './test_utils';

const kiInput = {
  type: 'index_metadata',
  title: 'logs-* index profile',
  description: 'Profile of the logs indices',
};

const enabled = async () => true;
const allowed = async () => true;

describe('getCreateKiStepDefinition', () => {
  it('indexes the KI into an index dest and returns the document id', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'ki-1' }) };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki: kiInput },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: 'ai-index-idx-my-ai-index',
        document: expect.objectContaining({ ...kiInput, '@timestamp': expect.any(String) }),
        refresh: 'wait_for',
      },
      { signal: context.abortSignal }
    );
  });

  it('uses op_type create for a data stream dest', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'ki-1' }) };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki: kiInput },
      esClient,
    });
    const service = mockAiIndexService({ type: 'data_stream', value: 'ai-index-ds-my-ai-index' });

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    await handler(context);

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ai-index-ds-my-ai-index', op_type: 'create' }),
      { signal: context.abortSignal }
    );
  });

  it('throws ValidationError when the dest is an index pattern', async () => {
    for (const destValue of ['ai-index-idx-foo*', 'ai-index-idx-foo,ai-index-idx-bar']) {
      const esClient = { index: jest.fn() };
      const context = createMockStepContext({
        input: { ai_index_id: 'my-ai-index', ki: kiInput },
        esClient,
      });
      const service = mockAiIndexService({ type: 'index', value: destValue });

      const { handler } = getCreateKiStepDefinition({
        getAiIndexService: () => service,
        isContextEngineEnabled: enabled,
        checkWritePrivilege: allowed,
      });
      const thrown = await handler(context).catch((e) => e);

      expect(thrown).toBeInstanceOf(ExecutionError);
      expect(thrown.type).toBe('ValidationError');
      expect(esClient.index).not.toHaveBeenCalled();
    }
  });

  it('lazily creates the AI index when it does not exist', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'ki-1' }) };
    const context = createMockStepContext({
      input: { ai_index_id: 'new-ai-index', ki: kiInput },
      esClient,
    });
    const service = {
      get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('new-ai-index')),
      create: jest.fn().mockResolvedValue(undefined),
    } as unknown as AiIndexService;

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(service.create).toHaveBeenCalledWith('new-ai-index', {
      dest: { type: 'index', value: 'ai-index-idx-new-ai-index' },
      automations: [],
      sources: [],
    });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ai-index-idx-new-ai-index' }),
      { signal: context.abortSignal }
    );
  });

  it('re-resolves the dest when losing a concurrent AI index creation race', async () => {
    const esClient = { index: jest.fn().mockResolvedValue({ _id: 'ki-1' }) };
    const context = createMockStepContext({
      input: { ai_index_id: 'new-ai-index', ki: kiInput },
      esClient,
    });
    const service = {
      get: jest
        .fn()
        .mockRejectedValueOnce(new AiIndexNotFoundError('new-ai-index'))
        .mockResolvedValueOnce({
          id: 'new-ai-index',
          dest: { type: 'data_stream', value: 'ai-index-ds-new-ai-index' },
        }),
      create: jest.fn().mockRejectedValue(new AiIndexAlreadyExistsError('new-ai-index')),
    } as unknown as AiIndexService;

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'ai-index-ds-new-ai-index', op_type: 'create' }),
      { signal: context.abortSignal }
    );
  });

  it('throws ValidationError when lazily creating with an invalid AI index id', async () => {
    const esClient = { index: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'Invalid Id', ki: kiInput },
      esClient,
    });
    const service = {
      get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('Invalid Id')),
      create: jest.fn(),
    } as unknown as AiIndexService;

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ValidationError');
    expect(service.create).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('throws FeatureDisabledError when Context Engine is disabled', async () => {
    const esClient = { index: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki: kiInput },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: async () => false,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('throws PermissionError when the workflow user lacks the write privilege', async () => {
    const esClient = { index: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki: kiInput },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const checkWritePrivilege = jest.fn().mockResolvedValue(false);

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(checkWritePrivilege).toHaveBeenCalledWith(context.contextManager.getFakeRequest());
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('propagates unexpected AI index service errors unwrapped', async () => {
    const cause = new Error('ES connection refused');
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki: kiInput },
      esClient: { index: jest.fn() },
    });
    const service = { get: jest.fn().mockRejectedValue(cause) } as unknown as AiIndexService;

    const { handler } = getCreateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBe(cause);
  });
});
