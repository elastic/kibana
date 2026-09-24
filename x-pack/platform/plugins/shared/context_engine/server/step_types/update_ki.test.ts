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
import { kiIdQuery } from '../ai_indices/ki_get';
import { getUpdateKiStepDefinition } from './update_ki';
import {
  createMockStepContext,
  mockAiIndexService,
  mockKiWriter,
  mockKiStepTelemetry,
} from './test_utils';

const storedKi = { type: 'index_metadata', title: 'logs-* index profile', id: 'ki-1' };
const deletedKi = { ...storedKi, governance: { lifecycle: { status: 'deleted' } } };
const searchHit = (index: string, source: object = storedKi) => ({
  hits: { hits: [{ _id: 'ki-1', _index: index, _seq_no: 5, _primary_term: 1, _source: source }] },
});

const createResponseError = (name: string, statusCode: number) =>
  new errors.ResponseError({
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name,
      request: {} as unknown as DiagnosticResult['meta']['request'],
    },
    warnings: [],
    body: name,
    statusCode,
  });
const createNotFoundResponseError = () => createResponseError('document_missing_exception', 404);
const createConflictResponseError = () =>
  createResponseError('version_conflict_engine_exception', 409);

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
    const telemetry = mockKiStepTelemetry();

    const { handler } = getUpdateKiStepDefinition({
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
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

  it('updates the KI in place with a revision check and records the updater', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { description: 'Updated' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'updated' } });
    expect(esClient.search).toHaveBeenCalledWith(
      {
        index: 'ai-index-idx-my-ai-index',
        ignore_unavailable: true,
        allow_no_indices: true,
        query: kiIdQuery('ki-1'),
        size: 2,
        seq_no_primary_term: true,
        _source: ['id', 'governance'],
      },
      { signal: context.abortSignal }
    );
    expect(esClient.update).toHaveBeenCalledWith(
      {
        index: 'ai-index-idx-my-ai-index',
        id: 'ki-1',
        doc: {
          description: 'Updated',
          updated_at: expect.any(String),
          governance: { provenance: { updated_by: mockKiWriter } },
        },
        if_seq_no: 5,
        if_primary_term: 1,
        refresh: 'wait_for',
      },
      { signal: context.abortSignal }
    );
  });

  it('sets the lifecycle status when provided', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: {
        ai_index_id: 'my-ai-index',
        ki_id: 'ki-1',
        ki: {},
        lifecycle: { status: 'deleted' },
      },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: {
          updated_at: expect.any(String),
          governance: {
            provenance: { updated_by: mockKiWriter },
            lifecycle: { status: 'deleted' },
          },
        },
      }),
      { signal: context.abortSignal }
    );
  });

  it('merges object fields and replaces arrays when appending a revision', async () => {
    const existing = {
      ...storedKi,
      attributes: { owner: 'search', confidence: 0.4 },
      references: [{ uri: 'index://old-*' }],
    };
    const esClient = {
      search: jest
        .fn()
        .mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001', existing)),
      index: jest.fn().mockResolvedValue({ _id: 'new' }),
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: {
        ai_index_id: 'my-ai-index',
        ki_id: 'ki-1',
        ki: { attributes: { confidence: 0.9 }, references: [{ uri: 'index://new-*' }] },
      },
      esClient,
    });
    const service = mockAiIndexService({ type: 'data_stream', value: 'ai-index-ds-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    const [{ document }] = esClient.index.mock.calls[0];
    expect(document.attributes).toEqual({ owner: 'search', confidence: 0.9 });
    expect(document.references).toEqual([{ uri: 'index://new-*' }]);
  });

  it('throws ConflictError when the KI has lifecycle status deleted', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { description: 'Updated' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ConflictError');
    expect(esClient.update).not.toHaveBeenCalled();
  });

  it('updates a deleted KI when force is true', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: {
        ai_index_id: 'my-ai-index',
        ki_id: 'ki-1',
        ki: {},
        lifecycle: { status: 'active' },
        force: true,
      },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'updated' } });
    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          governance: expect.objectContaining({ lifecycle: { status: 'active' } }),
        }),
      }),
      { signal: context.abortSignal }
    );
  });

  it('keeps the deleted status when force is given without a lifecycle', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index', deletedKi)),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'Kept' }, force: true },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    const [{ doc }] = esClient.update.mock.calls[0];
    expect(doc.title).toBe('Kept');
    expect(doc.governance).toEqual({ provenance: { updated_by: mockKiWriter } });
  });

  it('appends a new revision on a data stream', async () => {
    const existing = {
      ...storedKi,
      '@timestamp': '2026-01-01T00:00:00.000Z',
      governance: {
        provenance: { created_by: { uri: 'workflow://wf-0', metadata: {} } },
        lifecycle: { status: 'active' },
      },
    };
    const esClient = {
      search: jest
        .fn()
        .mockResolvedValue(searchHit('.ds-ai-index-ds-my-ai-index-000001', existing)),
      index: jest.fn().mockResolvedValue({ _id: 'new' }),
      update: jest.fn(),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'updated' } });
    expect(esClient.update).not.toHaveBeenCalled();
    expect(esClient.index).toHaveBeenCalledWith(
      {
        index: 'ai-index-ds-my-ai-index',
        document: {
          ...storedKi,
          description: 'Updated',
          '@timestamp': expect.any(String),
          updated_at: expect.any(String),
          governance: {
            provenance: {
              created_by: { uri: 'workflow://wf-0', metadata: {} },
              updated_by: mockKiWriter,
            },
            lifecycle: { status: 'active' },
          },
        },
        op_type: 'create',
        refresh: 'wait_for',
      },
      { signal: context.abortSignal }
    );
    const [{ document }] = esClient.index.mock.calls[0];
    expect(document['@timestamp']).not.toBe(existing['@timestamp']);
  });

  it('resolves the AI index with the workflow space id', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { description: 'Updated' } },
      esClient,
      spaceId: 'marketing',
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    await handler(context);

    expect(service.get).toHaveBeenCalledWith('my-ai-index', 'marketing');
  });

  it('throws ConflictError when the update loses the revision check', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockRejectedValue(createConflictResponseError()),
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
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('ConflictError');
  });

  it('returns noop without writing when there is nothing to change', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn(),
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
      ...mockKiStepTelemetry(),
    });
    const result = await handler(context);

    expect(result).toEqual({ output: { id: 'ki-1', result: 'noop' } });
    expect(esClient.update).not.toHaveBeenCalled();
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
  });

  it('reports a success event and logs after the update', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockResolvedValue({ result: 'updated' }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { description: 'Updated' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await handler(context);

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'update',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'success',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI 'ki-1' updated in AI index 'my-ai-index'"
    );
  });

  it('reports a failure event when the KI is missing', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      update: jest.fn(),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'missing-ki', ki: { title: 'New title' } },
      esClient,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await handler(context).catch(() => {});

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'update',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'failure',
      errorType: 'NotFoundError',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI update failed in AI index 'my-ai-index': NotFoundError"
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
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
      abortController,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await expect(handler(context)).rejects.toThrow('Request aborted');

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledTimes(1);
    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'update',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'aborted',
    });
    expect(telemetry.logger.debug).toHaveBeenCalledWith(
      "KI update aborted in AI index 'my-ai-index'"
    );
  });

  it('reports a failure event for a genuine error even when the signal is aborted', async () => {
    const abortController = new AbortController();
    const esClient = {
      search: jest.fn().mockResolvedValue(searchHit('ai-index-idx-my-ai-index')),
      update: jest.fn().mockImplementation(() => {
        abortController.abort();
        return Promise.reject(createNotFoundResponseError());
      }),
    };
    const context = createMockStepContext({
      input: { ai_index_id: 'my-ai-index', ki_id: 'ki-1', ki: { title: 'New title' } },
      esClient,
      abortController,
    });
    const service = mockAiIndexService({ type: 'index', value: 'ai-index-idx-my-ai-index' });
    const telemetry = mockKiStepTelemetry();

    const { handler } = getUpdateKiStepDefinition({
      getAiIndexService: () => service,
      isContextEngineEnabled: enabled,
      checkWritePrivilege: allowed,
      ...telemetry,
    });
    await handler(context).catch(() => {});

    expect(telemetry.analyticsService.reportKiWrite).toHaveBeenCalledWith({
      action: 'update',
      aiIndexId: 'my-ai-index',
      managed: false,
      outcome: 'failure',
      errorType: 'NotFoundError',
    });
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
      ...mockKiStepTelemetry(),
    });
    const thrown = await handler(context).catch((e) => e);

    expect(thrown).toBeInstanceOf(ExecutionError);
    expect(thrown.type).toBe('NotFoundError');
    expect(esClient.search).not.toHaveBeenCalled();
  });
});
