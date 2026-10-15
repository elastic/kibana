/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/transport';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AI_INDEX_MEMORIES_PATH,
  AI_INDEX_MEMORY_BY_ID_PATH,
  MAX_AI_INDEX_ID_LENGTH,
  MEMORY_API_PROVENANCE_SOURCE,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { MAX_KI_ID_LENGTH } from '../../common/step_types/ki';
import type { AiIndexMemoryWriteServiceApi } from '../ai_indices/memory_write_service';
import { MemoryWriteError } from '../ai_indices/memory_write_errors';
import { registerMemoryRoutes } from './memories';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    operationId: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: { request?: { body?: Type<unknown>; params?: Type<unknown> } };
}

describe('memory routes', () => {
  const routes: Record<string, RegisteredRoute> = {};
  const createMemory = jest.fn();
  const reviseMemory = jest.fn();
  const forgetMemory = jest.fn();
  const service: AiIndexMemoryWriteServiceApi = {
    createMemory,
    reviseMemory,
    forgetMemory,
  };
  const getAiIndexMemoryWriteService = jest.fn(() => service);
  const contextEngineEnabled = jest.fn();
  const currentUserClient = {};
  const response = httpServerMock.createResponseFactory();

  beforeAll(() => {
    const createRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (
        versionConfig: { validate: RegisteredRoute['validate'] },
        handler: RequestHandler
      ) => {
        routes[`${method}:${config.path}`] = {
          config,
          handler,
          validate: versionConfig.validate,
        };
      },
    });
    registerMemoryRoutes({
      router: {
        versioned: {
          post: createRoute('POST'),
          patch: createRoute('PATCH'),
          delete: createRoute('DELETE'),
        },
      } as unknown as IRouter,
      logger: loggerMock.create(),
      getAiIndexMemoryWriteService,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    contextEngineEnabled.mockResolvedValue(true);
  });

  const call = (
    method: string,
    path: string,
    params: Record<string, string>,
    body?: Record<string, unknown>
  ) =>
    routes[`${method}:${path}`].handler(
      {
        core: Promise.resolve({
          uiSettings: { client: { get: contextEngineEnabled } },
          elasticsearch: { client: { asCurrentUser: currentUserClient } },
        }),
      } as never,
      httpServerMock.createKibanaRequest({ params, body }),
      response
    );

  const body = {
    type: 'memory.session_fact',
    title: 'Duration mapping',
    description: 'duration_ms is a keyword.',
    content: 'Cast it before comparison.',
  };
  const createEsError = (statusCode: number, type: string, reason: string) =>
    new errors.ResponseError({
      meta: {
        aborted: false,
        attempts: 1,
        connection: null,
        context: null,
        name: type,
        request: {} as unknown as DiagnosticResult['meta']['request'],
      },
      warnings: [],
      body: {
        error: { type, reason },
      },
      statusCode,
    });

  it('registers public write-protected resource routes', () => {
    expect(Object.values(routes)).toHaveLength(3);
    for (const { config } of Object.values(routes)) {
      expect(config.access).toBe('public');
      expect(config.security.authz.requiredPrivileges).toEqual([apiPrivileges.writeContextEngine]);
    }
    expect(routes[`POST:${AI_INDEX_MEMORIES_PATH}`].config.operationId).toBe(
      'create-context-engine-memory'
    );
    expect(routes[`PATCH:${AI_INDEX_MEMORY_BY_ID_PATH}`].config.operationId).toBe(
      'revise-context-engine-memory'
    );
    expect(routes[`DELETE:${AI_INDEX_MEMORY_BY_ID_PATH}`].config.operationId).toBe(
      'delete-context-engine-memory'
    );
  });

  it('accepts partial revisions and rejects empty revision bodies', () => {
    const bodySchema = routes[`PATCH:${AI_INDEX_MEMORY_BY_ID_PATH}`].validate.request?.body;

    expect(bodySchema?.validate({ title: 'Updated title' })).toEqual({
      title: 'Updated title',
    });
    expect(() => bodySchema?.validate({})).toThrow('At least one memory field must be supplied.');
  });

  it('leaves session generation to the caller-scoped service', async () => {
    createMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'generated-session' });

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(getAiIndexMemoryWriteService).toHaveBeenCalledWith({
      esClient: currentUserClient,
      request: expect.anything(),
    });
    expect(createMemory).toHaveBeenCalledWith({
      aiIndexId: 'support',
      ...body,
      writer: { uri: MEMORY_API_PROVENANCE_SOURCE, metadata: {} },
    });
    expect(response.created).toHaveBeenCalledWith({
      body: { id: 'memory-1', session_id: 'generated-session' },
    });
  });

  it('revises with a caller-supplied session ID', async () => {
    reviseMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'session-1' });

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      { ...body, session_id: 'session-1' }
    );

    expect(reviseMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        aiIndexId: 'support',
        id: 'memory-1',
        sessionId: 'session-1',
      })
    );
  });

  it('passes only supplied revision fields to the service', async () => {
    reviseMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'existing-session' });

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      { title: 'Updated title' }
    );

    expect(reviseMemory).toHaveBeenCalledWith({
      aiIndexId: 'support',
      id: 'memory-1',
      title: 'Updated title',
      writer: { uri: MEMORY_API_PROVENANCE_SOURCE, metadata: {} },
    });
  });

  it('leaves an omitted revision session ID for the service to resolve', async () => {
    reviseMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'existing-session' });

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      body
    );

    expect(reviseMemory.mock.calls[0][0]).not.toHaveProperty('sessionId');
    expect(response.ok).toHaveBeenCalledWith({
      body: { id: 'memory-1', session_id: 'existing-session' },
    });
  });

  it('tombstones a memory', async () => {
    forgetMemory.mockResolvedValue({ id: 'memory-1' });

    await call('DELETE', AI_INDEX_MEMORY_BY_ID_PATH, {
      aiIndexId: 'support',
      memoryId: 'memory-1',
    });

    expect(forgetMemory).toHaveBeenCalledWith({
      aiIndexId: 'support',
      id: 'memory-1',
      writer: { uri: MEMORY_API_PROVENANCE_SOURCE, metadata: {} },
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { id: 'memory-1' } });
  });

  it('maps typed memory errors', async () => {
    reviseMemory.mockRejectedValue(
      new MemoryWriteError('memory_deleted', "Memory 'memory-1' was deleted.")
    );

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      body
    );

    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: "Memory 'memory-1' was deleted." },
    });
  });

  it('returns 404 when Memory is disabled', async () => {
    createMemory.mockRejectedValue(
      new MemoryWriteError('memory_disabled', 'Context Engine memory is not enabled.')
    );

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(response.notFound).toHaveBeenCalledWith({
      body: { message: 'Context Engine memory is not enabled.' },
    });
  });

  it('sanitizes an Elasticsearch version conflict and preserves HTTP 409', async () => {
    reviseMemory.mockRejectedValue(
      createEsError(409, 'version_conflict_engine_exception', 'conflict on hidden-index-name')
    );

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      body
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 409,
      body: { message: 'The memory write conflicted with another operation.' },
    });
  });

  it('does not expose Elasticsearch authorization details', async () => {
    createMemory.mockRejectedValue(
      createEsError(403, 'security_exception', 'missing privilege for secret-index-name')
    );

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 403,
      body: { message: 'Elasticsearch denied the memory write.' },
    });
  });

  it('returns a generic 500 for invalid stored Memory state', async () => {
    reviseMemory.mockRejectedValue(
      new MemoryWriteError(
        'invalid_memory_timestamp',
        "Memory 'memory-1' contains secret-index-name."
      )
    );

    await call(
      'PATCH',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      body
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'An unexpected error occurred while processing the memory request.' },
    });
  });

  it('preserves a retryable Elasticsearch 503 without exposing details', async () => {
    createMemory.mockRejectedValue(
      createEsError(503, 'unavailable_shards_exception', 'secret-index-name is unavailable')
    );

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 503,
      body: { message: 'Elasticsearch is temporarily unavailable.' },
    });
  });

  it.each([
    [401, 403, 'Elasticsearch denied the memory write.'],
    [429, 429, 'Elasticsearch is temporarily unable to process the memory write.'],
  ])(
    'maps Elasticsearch %i to HTTP %i without exposing details',
    async (esStatus, status, message) => {
      createMemory.mockRejectedValue(
        createEsError(esStatus, 'security_exception', 'secret-index-name')
      );

      await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: status,
        body: { message },
      });
    }
  );

  it('returns 404 before calling the service when Context Engine is disabled', async () => {
    contextEngineEnabled.mockResolvedValue(false);

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(response.notFound).toHaveBeenCalledWith({ body: { message: 'Not Found' } });
    expect(getAiIndexMemoryWriteService).not.toHaveBeenCalled();
  });

  it('bounds request strings and arrays', () => {
    const schema = routes[`POST:${AI_INDEX_MEMORIES_PATH}`].validate.request?.body;
    expect(() => schema?.validate({ ...body, content: 'x'.repeat(65537) })).toThrow();
    expect(() => schema?.validate({ ...body, tags: Array(101).fill('tag') })).toThrow();
    expect(() => schema?.validate({ ...body, expires_at: '2026-10-14' })).toThrow();
    expect(() => schema?.validate({ ...body, expires_at: '2026-02-30T12:00:00Z' })).toThrow();
    expect(() => schema?.validate({ ...body, expires_at: '2026-10-14T12:00:00Z' })).not.toThrow();
  });

  it('bounds path parameters', () => {
    const schema = routes[`PATCH:${AI_INDEX_MEMORY_BY_ID_PATH}`].validate.request?.params;
    expect(() =>
      schema?.validate({
        aiIndexId: 'x'.repeat(MAX_AI_INDEX_ID_LENGTH + 1),
        memoryId: 'memory-1',
      })
    ).toThrow();
    expect(() =>
      schema?.validate({
        aiIndexId: 'support',
        memoryId: 'x'.repeat(MAX_KI_ID_LENGTH + 1),
      })
    ).toThrow();
  });
});
