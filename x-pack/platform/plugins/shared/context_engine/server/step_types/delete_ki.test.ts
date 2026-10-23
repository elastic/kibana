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
import {
  createMockStepContext,
  mockAiIndexService,
  mockKiStepTelemetry,
  mockKiWriter,
} from './test_utils';

const storedKi = { type: 'index_metadata', title: 'logs-* index profile', id: 'ki-1' };
const searchHit = (index: string, source: object = storedKi) => ({
  hits: {
    hits: [{ _id: 'ki-1', _index: index, _seq_no: 5, _primary_term: 1, _source: source }],
  },
});

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
    const esClient = { search: jest.fn(), update: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: async () => false,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('FeatureDisabledError');
    expect(esClient.update).not.toHaveBeenCalled();
    expect(telemetry.analyticsService.reportKiWrite).not.toHaveBeenCalled();
  });

  it('throws PermissionError when the workflow user lacks the write privilege', async () => {
    const esClient = { search: jest.fn(), update: jest.fn() };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: async () => false,
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('PermissionError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('soft-deletes the KI in place on an index dest', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.update).toHaveBeenCalledWith(
      {
        index: 'ai-index-idx-my-ai-index',
        id: 'ki-1',
        doc: {
          updated_at: expect.any(String),
          governance: {
            provenance: { updated_by: mockKiWriter },
            lifecycle: { status: 'deleted' },
          },
        },
        if_seq_no: 5,
        if_primary_term: 1,
      },
      { signal: context.abortSignal }
    );
  });

  it('waits for the refresh when refresh is true', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', refresh: true },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    expect(esClient.update).toHaveBeenCalledWith(expect.objectContaining({ refresh: 'wait_for' }), {
      signal: context.abortSignal,
    });
  });

  it('appends a revision with lifecycle status deleted on a data stream', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001')),
      index: jest.fn().mockResolvedValue({ _id: 'new' }),
      update: jest.fn(),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: 'ai-index-ds-my-ai-index',
        document: {
          ...storedKi,
          '@timestamp': expect.any(String),
          updated_at: expect.any(String),
          governance: {
            provenance: { updated_by: mockKiWriter },
            lifecycle: { status: 'deleted' },
          },
        },
        op_type: 'create',
      },
      { signal: context.abortSignal }
    );
  });

  it('resolves the AI index with the workflow space id', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
      spaceId: 'marketing',
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    expect(service.get).toHaveBeenCalledWith('my-ai-index', 'marketing');
  });

  it('returns idempotently when the data stream KI is already deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'ki-1',
              _index: '.ds-ai-index-ds-my-ai-index-000001',
              _seq_no: 5,
              _primary_term: 1,
              _source: { ...storedKi, governance: { lifecycle: { status: 'deleted' } } },
            },
          ],
        },
      }),
      index: jest.fn(),
      update: jest.fn(),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('returns idempotently when the index-dest KI is already deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _id: 'ki-1',
              _index: 'ai-index-idx-my-ai-index',
              _seq_no: 5,
              _primary_term: 1,
              _source: { ...storedKi, governance: { lifecycle: { status: 'deleted' } } },
            },
          ],
        },
      }),
      update: jest.fn(),
      delete: jest.fn(),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1' } });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.delete).not.toHaveBeenCalled();
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
      ...mockKiStepTelemetry(),
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
  });

  it('reports a success event and logs after the delete', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await handler(context);

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'delete',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'success',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI 'ki-1' deleted from AI index 'my-ai-index'"
    );
  });

  it('reports a failure event when the KI is missing', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki' },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await handler(context).catch(() => {});

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'delete',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'failure',
      errorType: 'NotFoundError',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI delete failed in AI index 'my-ai-index': NotFoundError"
    );
  });

  it('reports an aborted event when the run was cancelled', async () => {
    const abortController = new AbortController();
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new errors.RequestAbortedError('Request aborted'));
      }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1' },
      esClient,
      abortController,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getDeleteKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await expect(handler(context)).rejects.toThrow('Request aborted');

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'delete',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'aborted',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI delete aborted in AI index 'my-ai-index'"
    );
  });

  it('throws NotFoundError when the AI index does not exist', async () => {
    const esClient = { search: jest.fn(), update: jest.fn() };
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
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
