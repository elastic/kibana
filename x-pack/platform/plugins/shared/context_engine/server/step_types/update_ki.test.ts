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
import { getUpdateKiStepDefinition } from './update_ki';
import { createMockStepContext, mockAiIndexService } from './test_utils';

const searchHit = (index: string) => ({ hits: { hits: [{ _id: 'ki-1', _index: index }] } });

const createNotFoundResponseError = () =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'document_missing_exception',
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: 'document_missing_exception',
    statusCode: 404,
  });

const enabled = async () => true;
const allowed = async () => true;

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
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('throws PermissionError when the workflow user lacks the write privilege', async () => {
    const esClient = { search: jest.fn(), update: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: async () => false,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
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
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'updated' } });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        index: 'ai-index-ds-my-ai-index',
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { ids: { values: ['ki-1'] } },
        size: 2,
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
      checkWritePrivilege: allowed,
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'noop' } });
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
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-foo*' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ValidationError');
    expect(esClient.update).not.toHaveBeenCalled();
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
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the KI was removed concurrently', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockRejectedValue(createNotFoundResponseError()),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
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
      checkWritePrivilege: allowed,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
