/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { registerSessionMemoryRoutes } from './session_memory';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_MEMORY_AI_INDEX_IDS,
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { BackgroundWriteTracker } from '../session_memory/background_write_tracker';
import type { SessionMemoryService } from '../session_memory/types';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
    options: { availability: unknown };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<Record<string, unknown>> } };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const aiIndex = (id: string) => ({ id, dest: { type: 'data_stream', value: `ai-index-ds-${id}` } });

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('session memory routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let memoryEnabled: boolean;
  let callerUserId: string | null;
  let getProfileId: jest.Mock<Promise<string | null>>;
  let getSessionMemoryService: jest.Mock<Promise<SessionMemoryService>>;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let aiIndexService: { get: jest.Mock };
  let logger: ReturnType<typeof loggerMock.create>;
  let auditLog: jest.Mock;
  let service: jest.Mocked<SessionMemoryService>;
  let getSpaces: jest.Mock<Promise<SpacesPluginStart>>;
  let authzResult: Record<string, boolean>;
  let backgroundWrites: BackgroundWriteTracker;
  let registerRoutes: (tracker?: BackgroundWriteTracker) => void;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
        userProfile: { getCurrentProfileId: getProfileId },
        elasticsearch: { client: { asCurrentUser: esClient } },
      }),
    }) as unknown as Parameters<RequestHandler>[0];

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body: validateBody(body) }), {
        authzResult,
      }),
      response
    );

  const writableIndices = (writable: Record<string, boolean>) =>
    esClient.security.hasPrivileges.mockResolvedValueOnce({
      index: Object.fromEntries(Object.entries(writable).map(([name, write]) => [name, { write }])),
    } as never);

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  beforeEach(() => {
    featureFlagEnabled = true;
    memoryEnabled = true;
    callerUserId = 'jdoe';
    getProfileId = jest.fn(async () => callerUserId);
    authzResult = {};
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    aiIndexService = { get: jest.fn(async (id: string) => aiIndex(id)) };
    logger = loggerMock.create();
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    routes = {};
    service = {
      remember: jest.fn(async (_scope, { id }) => ({ id: id ?? 'unused' })),
      get: jest.fn(async ({ userId }, id) => ({
        id,
        sessionId: 's1',
        userId,
        aiIndexIds: [],
        content: 'existing',
        attributes: {},
        revisedAt: '2026-11-08T09:00:00.000Z',
      })),
      forget: jest.fn(),
      readRevised: jest.fn(),
    };
    getSessionMemoryService = jest.fn(async () => service);
    getSpaces = jest.fn(
      async () =>
        ({ spacesService: { getSpaceId: () => 'marketing' } }) as unknown as SpacesPluginStart
    );

    const router = {
      versioned: {
        post: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (
            versionConfig: { validate: RegisteredRoute['validate'] },
            handler: RequestHandler
          ) => {
            routes[config.path] = { config, handler, validate: versionConfig.validate };
          },
        })),
      },
    } as unknown as IRouter;

    registerRoutes = (tracker = backgroundWrites) => {
      registerSessionMemoryRoutes({
        router,
        getSpaces,
        getSessionMemoryService,
        getAiIndexService: () => aiIndexService as unknown as AiIndexService,
        isMemoryEnabled: async () => memoryEnabled,
        backgroundWrites: tracker,
        logger,
      });
    };
    backgroundWrites = new BackgroundWriteTracker({ logger });
    registerRoutes();
    route = routes[SESSION_MEMORY_FORGET_PATH];
  });

  it('registers a public experimental route that needs write and checks manage memory', () => {
    expect(route.config).toMatchObject({
      path: SESSION_MEMORY_FORGET_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.writeContextEngine],
          extendedPrivileges: [apiPrivileges.manageMemory],
        },
      },
      options: { availability: { stability: 'experimental' } },
    });
  });

  it('returns 404 and touches nothing when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute({ user_id: 'jdoe', ids: ['m1'] });

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(service.forget).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('still forgets memories when memory is turned off', async () => {
    memoryEnabled = false;
    service.forget.mockResolvedValue([{ id: 'a', outcome: 'forgotten' }]);

    await callRoute({ ids: ['a'] });

    expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, ['a']);
    expect(response.ok).toHaveBeenCalledTimes(1);
  });

  describe('whose memory', () => {
    it('forgets the memories of the caller when user_id is missing', async () => {
      service.forget.mockResolvedValue([{ id: 'a', outcome: 'forgotten' }]);

      await callRoute({ ids: ['a'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 and audits every unique id when user_id is missing and caller has no profile', async () => {
      callerUserId = null;

      await callRoute({ ids: ['a', 'b', 'a'] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining('The caller has no user profile') },
      });
      expect(service.forget).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=a]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=b]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
        }),
      ]);
      expect(auditedEvents()[0]).not.toHaveProperty('user');
    });

    it('returns 403 and audits the attempt when user_id names another user without manage memory', async () => {
      await callRoute({ user_id: 'other', ids: ['a', 'b'] });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining(apiPrivileges.manageMemory) },
      });
      expect(service.forget).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: expect.objectContaining({
            code: 'Forbidden',
            message: expect.stringContaining(apiPrivileges.manageMemory),
          }),
          user: { target: { id: 'other' } },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'Forbidden' }),
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
        }),
      ]);
    });

    it('forgets the memories of another user with manage memory even when caller has no profile', async () => {
      callerUserId = null;
      authzResult = { [apiPrivileges.manageMemory]: true };
      service.forget.mockResolvedValue([{ id: 'a', outcome: 'forgotten' }]);

      await callRoute({ user_id: 'other', ids: ['a'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'other' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('audits and rethrows when resolving the caller profile fails', async () => {
      getProfileId.mockRejectedValueOnce(new Error('profile activation failed'));

      await expect(callRoute({ ids: ['a'] })).rejects.toThrow('profile activation failed');
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: { code: 'Error', message: 'profile activation failed' },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
      ]);
    });
  });

  describe('forgetting', () => {
    it('forgets in the request space for the body user and answers in request order, without duplicates', async () => {
      service.forget.mockResolvedValue([
        { id: 'b', outcome: 'forgotten' },
        { id: '2', outcome: 'already_forgotten' },
        { id: 'a', outcome: 'not_found' },
        { id: 'd', outcome: 'failed', error: 'index_read_only_allow_delete_block' },
      ]);

      await callRoute({ user_id: 'jdoe', ids: ['b', '2', 'a', 'd', 'b'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'b',
        '2',
        'a',
        'd',
      ]);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          results: [
            { id: 'b', outcome: 'forgotten' },
            { id: '2', outcome: 'already_forgotten' },
            { id: 'a', outcome: 'not_found' },
            { id: 'd', outcome: 'failed', error: 'index_read_only_allow_delete_block' },
          ],
        },
      });
    });

    it('audits each memory once, recording not_found and failed outcomes as failures', async () => {
      service.forget.mockResolvedValue([
        { id: 'a', outcome: 'forgotten' },
        { id: 'b', outcome: 'already_forgotten' },
        { id: 'c', outcome: 'not_found' },
        { id: 'd', outcome: 'failed', error: 'tombstone rejected' },
      ]);

      await callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'c', 'd', 'a'] });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'User has forgotten session memory [id=a] of user [id=jdoe]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'success' }),
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'success' }),
        }),
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=c] of user [id=jdoe]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: expect.objectContaining({ code: 'not_found' }),
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'c' } },
        }),
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=d] of user [id=jdoe]',
          event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
          error: { code: 'failed', message: 'tombstone rejected' },
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'd' } },
        }),
      ]);
    });
  });

  it('audits a failure for every memory and rethrows when resolving the space fails', async () => {
    const error = new Error('spaces unavailable');
    getSpaces.mockRejectedValueOnce(error);

    await expect(callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'a'] })).rejects.toBe(error);

    expect(service.forget).not.toHaveBeenCalled();
    expect(auditedEvents()).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
        error: { code: 'Error', message: 'spaces unavailable' },
        user: { target: { id: 'jdoe' } },
        kibana: { saved_object: { type: 'session_memory', id: 'a' } },
      }),
      expect.objectContaining({
        event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
        error: { code: 'Error', message: 'spaces unavailable' },
        user: { target: { id: 'jdoe' } },
        kibana: { saved_object: { type: 'session_memory', id: 'b' } },
      }),
    ]);
  });

  it('audits a failure for every memory and rethrows when the service throws', async () => {
    const error = new Error('shard unavailable');
    service.forget.mockRejectedValue(error);

    await expect(callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'a'] })).rejects.toBe(error);

    expect(response.ok).not.toHaveBeenCalled();
    expect(auditedEvents()).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
        error: { code: 'Error', message: 'shard unavailable' },
        kibana: { saved_object: { type: 'session_memory', id: 'a' } },
      }),
      expect.objectContaining({
        event: expect.objectContaining({ action: 'memory_forget', outcome: 'failure' }),
        error: { code: 'Error', message: 'shard unavailable' },
        kibana: { saved_object: { type: 'session_memory', id: 'b' } },
      }),
    ]);
  });

  describe('request validation', () => {
    it('accepts a request without user_id', () => {
      expect(validateBody({ ids: ['a'] })).toEqual({ ids: ['a'] });
    });

    it('accepts a request with user_id', () => {
      expect(validateBody({ user_id: 'jdoe', ids: ['a'] })).toEqual({
        user_id: 'jdoe',
        ids: ['a'],
      });
    });

    it.each([
      ['no ids', { user_id: 'jdoe', ids: [] }],
      [
        'too many ids',
        {
          user_id: 'jdoe',
          ids: Array.from({ length: MAX_SESSION_MEMORY_FORGET_IDS + 1 }, (_, i) => `m${i}`),
        },
      ],
      ['an empty user_id', { user_id: '', ids: ['a'] }],
      ['a blank user_id', { user_id: '   ', ids: ['a'] }],
      ['an over-long user_id', { user_id: 'u'.repeat(MAX_MEMORY_USER_ID_LENGTH + 1), ids: ['a'] }],
      ['an empty id', { user_id: 'jdoe', ids: [''] }],
      ['a blank id', { user_id: 'jdoe', ids: ['  '] }],
      ['an over-long id', { user_id: 'jdoe', ids: ['i'.repeat(MAX_MEMORY_ID_LENGTH + 1)] }],
    ])('rejects %s', (_name, body) => {
      expect(() => validateBody(body)).toThrow();
    });

    it('accepts the largest allowed request', () => {
      expect(() =>
        validateBody({
          user_id: 'u'.repeat(MAX_MEMORY_USER_ID_LENGTH),
          ids: Array.from({ length: MAX_SESSION_MEMORY_FORGET_IDS }, () =>
            'i'.repeat(MAX_MEMORY_ID_LENGTH)
          ),
        })
      ).not.toThrow();
    });
  });

  describe('_remember', () => {
    const body = {
      session_id: 's1',
      user_id: 'jdoe',
      ai_index_ids: ['ops-memory'],
      content: 'Root cause is a connection pool limit.',
      attributes: { incident: 'INC-4211' },
    };
    const { user_id: _userId, ...bodyWithoutUser } = body;

    beforeEach(() => {
      route = routes[SESSION_MEMORY_REMEMBER_PATH];
    });

    const remembered = () => service.remember.mock.calls[0];
    const acceptedId = () => response.accepted.mock.calls[0][0]?.body as { id: string };

    it('registers a public experimental route that needs write and checks manage memory', () => {
      expect(route.config).toMatchObject({
        path: SESSION_MEMORY_REMEMBER_PATH,
        access: 'public',
        security: {
          authz: {
            requiredPrivileges: [apiPrivileges.writeContextEngine],
            extendedPrivileges: [apiPrivileges.manageMemory],
          },
        },
        options: { availability: { stability: 'experimental' } },
      });
    });

    describe('request', () => {
      it('answers 202 with a generated id, deduplicates ai_index_ids, and remembers in the request space', async () => {
        writableIndices({ 'ai-index-ds-ops-memory': true });

        await callRoute({ ...body, ai_index_ids: ['ops-memory', 'ops-memory'] });

        expect(acceptedId().id).toMatch(UUID_PATTERN);
        expect(remembered()).toEqual([
          { space: 'marketing', userId: 'jdoe' },
          {
            id: acceptedId().id,
            sessionId: 's1',
            content: body.content,
            aiIndexIds: ['ops-memory'],
            attributes: body.attributes,
          },
        ]);
      });

      it('revises an existing memory named by id and returns that id', async () => {
        await callRoute({ ...body, ai_index_ids: undefined, id: 'm1' });

        expect(service.get).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, 'm1');
        expect(response.accepted).toHaveBeenCalledWith({ body: { id: 'm1' } });
        expect(remembered()[1]).toMatchObject({ id: 'm1' });
      });

      it('does not look up the memory when id is omitted', async () => {
        await callRoute({ ...body, ai_index_ids: undefined });

        expect(service.get).not.toHaveBeenCalled();
        expect(response.accepted).toHaveBeenCalledTimes(1);
      });

      it('returns 404, audits failure, and remembers nothing when revising a missing or forgotten id', async () => {
        service.get.mockResolvedValueOnce(undefined);

        await callRoute({ ...body, ai_index_ids: undefined, id: 'missing-id' });

        expect(response.notFound).toHaveBeenCalledWith({
          body: { message: "Session memory 'missing-id' not found" },
        });
        expect(response.accepted).not.toHaveBeenCalled();
        expect(service.remember).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'memory_remember',
              type: ['change'],
              outcome: 'failure',
            }),
            error: { code: 'NotFound', message: "Session memory 'missing-id' not found" },
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_memory', id: 'missing-id' } },
          }),
        ]);
      });

      it('audits and rethrows when looking up a revision id fails', async () => {
        service.get.mockRejectedValueOnce(new Error('search failed'));

        await expect(callRoute({ ...body, ai_index_ids: undefined, id: 'm1' })).rejects.toThrow(
          'search failed'
        );
        expect(service.remember).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'memory_remember',
              type: ['change'],
              outcome: 'failure',
            }),
            error: { code: 'Error', message: 'search failed' },
            kibana: { saved_object: { type: 'session_memory', id: 'm1' } },
          }),
        ]);
      });

      it("files the memory under the caller's profile when user_id is left out", async () => {
        await callRoute({ ...bodyWithoutUser, ai_index_ids: undefined });

        expect(remembered()[0]).toEqual({ space: 'marketing', userId: 'jdoe' });
      });

      it('returns 403 and remembers nothing for a caller without a profile and without user_id', async () => {
        callerUserId = null;

        await callRoute(bodyWithoutUser);

        expect(response.forbidden).toHaveBeenCalledWith({
          body: { message: expect.stringContaining('The caller has no user profile') },
        });
        expect(response.accepted).not.toHaveBeenCalled();
        expect(service.remember).not.toHaveBeenCalled();
      });

      it('returns 403, audits and remembers nothing when user_id names another user without manage memory', async () => {
        await callRoute({ ...body, user_id: 'other' });

        expect(response.forbidden).toHaveBeenCalledWith({
          body: { message: expect.stringContaining(apiPrivileges.manageMemory) },
        });
        expect(service.remember).not.toHaveBeenCalled();
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            user: { target: { id: 'other' } },
          }),
        ]);
      });

      it('remembers the memory of another user with manage memory even when caller has no profile', async () => {
        callerUserId = null;
        authzResult = { [apiPrivileges.manageMemory]: true };

        await callRoute({ ...body, ai_index_ids: undefined, user_id: 'other' });

        expect(remembered()[0]).toEqual({ space: 'marketing', userId: 'other' });
      });

      it('returns 404 and remembers nothing when an AI index does not exist', async () => {
        aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('ops-memory'));

        await callRoute(body);

        expect(response.notFound).toHaveBeenCalledWith({
          body: { message: expect.stringContaining("'ops-memory' not found") },
        });
        expect(service.remember).not.toHaveBeenCalled();
      });

      it('returns 403 and remembers nothing when an AI index is not writable', async () => {
        writableIndices({ 'ai-index-ds-ops-memory': false });

        await callRoute(body);

        expect(response.forbidden).toHaveBeenCalledWith({
          body: { message: expect.stringContaining("AI index 'ops-memory' is not writable") },
        });
        expect(service.remember).not.toHaveBeenCalled();
      });

      it('returns 404 and remembers nothing when memory is turned off', async () => {
        memoryEnabled = false;

        await callRoute(body);

        expect(response.notFound).toHaveBeenCalledWith({
          body: { message: 'Context Engine memory is turned off.' },
        });
        expect(service.remember).not.toHaveBeenCalled();
      });

      it('audits and rethrows when resolving the caller profile fails', async () => {
        getProfileId.mockRejectedValueOnce(new Error('profile activation failed'));

        await expect(callRoute(bodyWithoutUser)).rejects.toThrow('profile activation failed');
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'Error', message: 'profile activation failed' },
          }),
        ]);
      });

      it('audits and rethrows when checking AI index writability fails', async () => {
        esClient.security.hasPrivileges.mockRejectedValueOnce(new Error('cluster_block'));

        await expect(callRoute(body)).rejects.toThrow('cluster_block');
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'Error', message: 'cluster_block' },
            user: { target: { id: 'jdoe' } },
          }),
        ]);
      });

      it('audits and rethrows when getting the session memory service fails', async () => {
        getSessionMemoryService.mockRejectedValueOnce(new Error('index init failed'));

        await expect(callRoute({ ...body, ai_index_ids: undefined })).rejects.toThrow(
          'index init failed'
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'Error', message: 'index init failed' },
            user: { target: { id: 'jdoe' } },
          }),
        ]);
      });
    });

    describe('validation', () => {
      const tooLong = (length: number) => 'x'.repeat(length + 1);
      const attributesOf = (count: number) =>
        Object.fromEntries(Array.from({ length: count }, (_, i) => [`k${i}`, 'v']));

      it('accepts a valid body', () => {
        expect(() => validateBody(body)).not.toThrow();
      });

      it('accepts the largest number of attributes', () => {
        expect(() =>
          validateBody({ ...body, attributes: attributesOf(MAX_SESSION_MEMORY_ATTRIBUTES) })
        ).not.toThrow();
      });

      it.each([
        ['blank id', { ...body, id: '   ' }],
        ['id over the limit', { ...body, id: tooLong(MAX_MEMORY_ID_LENGTH) }],
        ['blank session_id', { ...body, session_id: '   ' }],
        ['session_id over the limit', { ...body, session_id: tooLong(MAX_MEMORY_ID_LENGTH) }],
        ['blank user_id', { ...body, user_id: '   ' }],
        ['user_id over the limit', { ...body, user_id: tooLong(MAX_MEMORY_USER_ID_LENGTH) }],
        ['invalid ai_index_id', { ...body, ai_index_ids: ['INVALID_UPPER'] }],
        [
          'too many ai_index_ids',
          {
            ...body,
            ai_index_ids: Array.from({ length: MAX_MEMORY_AI_INDEX_IDS + 1 }, (_, i) => `ai-${i}`),
          },
        ],
        ['content over the limit', { ...body, content: tooLong(MAX_KI_CONTENT_LENGTH) }],
        ['empty content', { ...body, content: '' }],
        ['blank content', { ...body, content: '   ' }],
        ['blank attribute key', { ...body, attributes: { '   ': 'v' } }],
        [
          'attribute key over the limit',
          { ...body, attributes: { [tooLong(MAX_SESSION_MEMORY_ATTRIBUTE_KEY_LENGTH)]: 'v' } },
        ],
        [
          'too many attributes',
          { ...body, attributes: attributesOf(MAX_SESSION_MEMORY_ATTRIBUTES + 1) },
        ],
        [
          'an attribute value over the limit',
          { ...body, attributes: { incident: tooLong(MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH) } },
        ],
        ['a missing session_id', { content: 'c' }],
      ])('rejects %s', (_name, invalid) => {
        expect(() => validateBody(invalid)).toThrow();
      });
    });

    describe('audit', () => {
      let finishWrite: () => void;

      beforeEach(() => {
        service.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishWrite = () => resolve({ id: 'unused' });
          })
        );
      });

      it('writes the success event only once the write has finished', async () => {
        await callRoute({ ...body, ai_index_ids: undefined });
        await flushPromises();

        expect(response.accepted).toHaveBeenCalledTimes(1);
        expect(auditLog).not.toHaveBeenCalled();

        finishWrite();
        await flushPromises();

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: `User has remembered session memory [id=${
              acceptedId().id
            }] of session [id=s1]`,
            event: expect.objectContaining({
              action: 'memory_remember',
              type: ['creation'],
              outcome: 'success',
            }),
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_memory', id: acceptedId().id } },
          }),
        ]);
      });

      it('records a revision as a change', async () => {
        await callRoute({ ...body, ai_index_ids: undefined, id: 'm1' });
        finishWrite();
        await flushPromises();

        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            event: expect.objectContaining({ type: ['change'], outcome: 'success' }),
            kibana: { saved_object: { type: 'session_memory', id: 'm1' } },
          })
        );
      });
    });

    describe('a failed write', () => {
      beforeEach(() => {
        service.remember.mockRejectedValueOnce(
          Object.assign(new Error('contains secret memory content'), { name: 'TimeoutError' })
        );
      });

      it('still answers 202, logs only the error name with the memory id, and audits the failure', async () => {
        await callRoute({ ...body, ai_index_ids: undefined });
        await flushPromises();

        expect(response.accepted).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${acceptedId().id}]: TimeoutError`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: `Failed attempt to remember session memory [id=${
              acceptedId().id
            }] of session [id=s1]`,
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'TimeoutError', message: 'TimeoutError' },
          }),
        ]);
      });

      it('logs ResponseError status without leaking ES reason or body', async () => {
        service.remember.mockReset();
        service.remember.mockRejectedValueOnce(
          new errors.ResponseError(
            elasticsearchClientMock.createApiResponse({
              statusCode: 400,
              body: {
                error: {
                  type: 'mapper_parsing_exception',
                  reason: "Preview of field's value: 'top-secret memory content'",
                },
              },
            })
          )
        );

        await callRoute({ ...body, ai_index_ids: undefined });
        await flushPromises();

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${acceptedId().id}]: ResponseError (status 400)`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'ResponseError', message: 'ResponseError (status 400)' },
          }),
        ]);
      });

      it('logs and audits non-Error rejections without leaking the rejected value', async () => {
        service.remember.mockReset();
        service.remember.mockRejectedValueOnce('raw rejection with secret content');
        const unhandled = jest.fn();
        process.on('unhandledRejection', unhandled);
        try {
          await callRoute({ ...body, ai_index_ids: undefined });
          await flushPromises();
        } finally {
          process.off('unhandledRejection', unhandled);
        }

        expect(unhandled).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${acceptedId().id}]: Error`
        );
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'Error', message: 'Error' },
          }),
        ]);
      });

      it('leaves no unhandled rejection', async () => {
        const unhandled = jest.fn();
        process.on('unhandledRejection', unhandled);
        try {
          await callRoute({ ...body, ai_index_ids: undefined });
          await flushPromises();
        } finally {
          process.off('unhandledRejection', unhandled);
        }

        expect(unhandled).not.toHaveBeenCalled();
      });
    });

    describe('audit of a rejected request', () => {
      it('writes one failure event for a caller without a profile', async () => {
        callerUserId = null;

        await callRoute({ ...bodyWithoutUser, id: 'm1' });

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({
              action: 'memory_remember',
              type: ['change'],
              outcome: 'failure',
            }),
            error: expect.objectContaining({ code: 'Forbidden' }),
            kibana: { saved_object: { type: 'session_memory', id: 'm1' } },
          }),
        ]);
        expect(auditedEvents()[0]).not.toHaveProperty('user');
      });

      it('writes one failure event for a missing AI index, without a memory id when none was sent', async () => {
        aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('ops-memory'));

        await callRoute(body);

        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            message: 'Failed attempt to remember session memory of session [id=s1]',
            event: expect.objectContaining({ outcome: 'failure' }),
            user: { target: { id: 'jdoe' } },
          }),
        ]);
        expect(auditedEvents()[0]).not.toHaveProperty('kibana');
      });

      it('writes one failure event for an unwritable AI index', async () => {
        writableIndices({ 'ai-index-ds-ops-memory': false });

        await callRoute(body);

        expect(auditLog).toHaveBeenCalledTimes(1);
        expect(auditLog).toHaveBeenCalledWith(
          expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
        );
      });

      it('writes nothing while memory is turned off', async () => {
        memoryEnabled = false;

        await callRoute(body);

        expect(auditLog).not.toHaveBeenCalled();
      });
    });

    describe('backpressure and shutdown', () => {
      it('returns 429 with Retry-After and audits failure when in-flight writes hit maxInFlight', async () => {
        registerRoutes(new BackgroundWriteTracker({ maxInFlight: 1, logger }));
        route = routes[SESSION_MEMORY_REMEMBER_PATH];

        let finishFirst!: () => void;
        service.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishFirst = () => resolve({ id: 'm1' });
          })
        );

        await callRoute({ ...body, ai_index_ids: undefined, id: 'm1' });
        expect(response.accepted).toHaveBeenCalledTimes(1);

        await callRoute({ ...body, ai_index_ids: undefined, id: 'm2' });

        expect(response.customError).toHaveBeenCalledWith({
          statusCode: 429,
          body: { message: expect.stringContaining('Too many session memory writes') },
          headers: { 'Retry-After': '1' },
        });
        expect(service.remember).toHaveBeenCalledTimes(1);
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'TooManyRequests' }),
            user: { target: { id: 'jdoe' } },
            kibana: { saved_object: { type: 'session_memory', id: 'm2' } },
          }),
        ]);

        finishFirst();
        await flushPromises();

        await callRoute({ ...body, ai_index_ids: undefined, id: 'm3' });
        expect(response.accepted).toHaveBeenCalledTimes(2);
      });

      it('returns 429 with Retry-After and audits failure while draining on shutdown', async () => {
        let finishPending!: () => void;
        service.remember.mockReturnValueOnce(
          new Promise((resolve) => {
            finishPending = () => resolve({ id: 'm1' });
          })
        );

        await callRoute({ ...body, ai_index_ids: undefined, id: 'm1' });
        const drainPromise = backgroundWrites.drain();

        await callRoute({ ...body, ai_index_ids: undefined });

        expect(response.customError).toHaveBeenCalledWith({
          statusCode: 429,
          body: { message: expect.stringContaining('Too many session memory writes') },
          headers: { 'Retry-After': '1' },
        });
        expect(service.remember).toHaveBeenCalledTimes(1);
        expect(auditedEvents()).toEqual([
          expect.objectContaining({
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: expect.objectContaining({ code: 'TooManyRequests' }),
            user: { target: { id: 'jdoe' } },
          }),
        ]);
        expect(auditedEvents()[0]).not.toHaveProperty('kibana');

        finishPending();
        await drainPromise;
      });
    });
  });
});
