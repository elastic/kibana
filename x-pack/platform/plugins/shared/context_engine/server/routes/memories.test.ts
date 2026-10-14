/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  AI_INDEX_MEMORIES_PATH,
  AI_INDEX_MEMORY_BY_ID_PATH,
  MEMORY_API_PROVENANCE_SOURCE,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { AiIndexMemoryWriteServiceApi } from '../ai_indices/memory_write_service';
import { MemoryWriteError } from '../ai_indices/memory_write_errors';
import { registerMemoryRoutes } from './memories';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: { request?: { body?: Type<unknown> } };
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
          put: createRoute('PUT'),
          delete: createRoute('DELETE'),
        },
      } as unknown as IRouter,
      logger: loggerMock.create(),
      getAiIndexMemoryWriteService,
      generateSessionId: () => 'generated-session',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
          uiSettings: { client: { get: jest.fn().mockResolvedValue(true) } },
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

  it('registers public write-protected resource routes', () => {
    expect(Object.values(routes)).toHaveLength(3);
    for (const { config } of Object.values(routes)) {
      expect(config.access).toBe('public');
      expect(config.security.authz.requiredPrivileges).toEqual([apiPrivileges.writeContextEngine]);
    }
  });

  it('creates with the current-user client, generated session, and API provenance', async () => {
    createMemory.mockResolvedValue({ id: 'memory-1', sessionId: 'generated-session' });

    await call('POST', AI_INDEX_MEMORIES_PATH, { aiIndexId: 'support' }, body);

    expect(getAiIndexMemoryWriteService).toHaveBeenCalledWith({
      esClient: currentUserClient,
      request: expect.anything(),
    });
    expect(createMemory).toHaveBeenCalledWith({
      aiIndexId: 'support',
      sessionId: 'generated-session',
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
      'PUT',
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
      'PUT',
      AI_INDEX_MEMORY_BY_ID_PATH,
      { aiIndexId: 'support', memoryId: 'memory-1' },
      body
    );

    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: "Memory 'memory-1' was deleted." },
    });
  });

  it('bounds request strings and arrays', () => {
    const schema = routes[`POST:${AI_INDEX_MEMORIES_PATH}`].validate.request?.body;
    expect(() => schema?.validate({ ...body, content: 'x'.repeat(65537) })).toThrow();
    expect(() => schema?.validate({ ...body, tags: Array(101).fill('tag') })).toThrow();
    expect(() => schema?.validate({ ...body, expires_at: '2026-10-14' })).toThrow();
    expect(() => schema?.validate({ ...body, expires_at: '2026-10-14T12:00:00Z' })).not.toThrow();
  });
});
