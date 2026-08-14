/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { ExecutionError } from '@kbn/workflows/server';
import type { AiIndexService } from '../ai_indices/service';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { getDeleteKiStepDefinition } from './delete_ki';
import { createMockStepContext, mockAiIndexService } from './test_utils';

const searchHit = (index: string) => ({ hits: { hits: [{ _id: 'ki-1', _index: index }] } });

const createNotFoundResponseError = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'index_not_found_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: 'index_not_found_exception',
    statusCode: 404,
  });

const enabled = async () => true;
const allowed = async () => true;

describe('getDeleteKiStepDefinition', () => {
  it('throws FeatureDisabledError when Context Engine is disabled', async () => {
    const esClient = { search: jest.fn(), delete: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: async () => false,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('throws PermissionError when the workflow user lacks the write privilege', async () => {
    const esClient = { search: jest.fn(), delete: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: async () => false,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('deletes the KI from its backing index and returns the document id', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001')),
      delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'data_stream', value: 'ai-index-ds-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.delete).toHaveBeenCalledWith(
      {
        index: '.ds-ai-index-ds-my-ai-index-000001',
        id: 'ki-1',
        refresh: 'wait_for',
      },
      { signal: context.abortSignal }
    );
  });

  it('throws ValidationError when the KI id matches documents in multiple backing indices', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _id: 'ki-1', _index: 'ai-index-idx-foo' },
            { _id: 'ki-1', _index: 'ai-index-idx-bar' },
          ],
        },
      }),
      delete: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({
      type: 'index',
      value: 'ai-index-idx-foo,ai-index-idx-bar',
    });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ValidationError');
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the KI does not exist in the AI index', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      delete: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the KI was removed concurrently', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      delete: jest.fn().mockRejectedValue(createNotFoundResponseError()),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
  });

  it('throws NotFoundError when the AI index does not exist', async () => {
    const esClient = { search: jest.fn(), delete: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'missing', ki_id: 'ki-1' },
      esClient,
    });
    const service = {
      get: jest.fn().mockRejectedValue(new AiIndexNotFoundError('missing')),
    } as unknown as AiIndexService;

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
