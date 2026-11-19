/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { registerSessionMemoryRoutes } from './session_memory';
import {
  MAX_KI_CONTENT_LENGTH,
  MAX_SESSION_MEMORY_ATTRIBUTES,
  MAX_SESSION_MEMORY_ATTRIBUTE_VALUE_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_USER_ID_LENGTH,
  SESSION_MEMORY_FORGET_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { SessionMemoryService } from '../session_memory/types';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[]; extendedPrivileges: string[] } };
    options: { availability: unknown };
  };
  handler: RequestHandler;
  validate: { request: { body: Type<unknown> } };
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
  let profileUid: string | null;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let aiIndexService: { get: jest.Mock };
  let logger: ReturnType<typeof loggerMock.create>;
  let auditLog: jest.Mock;
  let service: jest.Mocked<SessionMemoryService>;
  let authzResult: Record<string, boolean>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
        userProfile: { getCurrentProfileId: async () => profileUid },
        elasticsearch: { client: { asCurrentUser: esClient } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body }), { authzResult }),
      response
    );

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const writableIndices = (writable: Record<string, boolean>) =>
    esClient.security.hasPrivileges.mockResolvedValueOnce({
      index: Object.fromEntries(Object.entries(writable).map(([name, write]) => [name, { write }])),
    } as never);

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  beforeEach(() => {
    featureFlagEnabled = true;
    memoryEnabled = true;
    profileUid = 'jdoe';
    authzResult = { [apiPrivileges.manageMemory]: false };
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    aiIndexService = { get: jest.fn(async (id: string) => aiIndex(id)) };
    logger = loggerMock.create();
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    routes = {};
    service = {
      remember: jest.fn(async (_scope, { id }) => ({ id: id ?? 'unused' })),
      get: jest.fn(),
      forget: jest.fn(),
      hardDelete: jest.fn(),
    };

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

    registerSessionMemoryRoutes({
      router,
      getSpaces: async () =>
        ({ spacesService: { getSpaceId: () => 'marketing' } } as unknown as SpacesPluginStart),
      getSessionMemoryService: async () => service,
      getAiIndexService: () => aiIndexService as unknown as AiIndexService,
      isMemoryEnabled: async () => memoryEnabled,
      logger,
    });
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

    await callRoute({ user_id: 'jdoe', ids: ['m1'], mode: 'tombstone' });

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(service.forget).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  describe('whose memory', () => {
    it('forgets the memories of the caller when user_id is missing', async () => {
      service.forget.mockResolvedValue({ a: 'forgotten' });

      await callRoute({ ids: ['a'], mode: 'tombstone' });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when user_id is missing and the caller has no profile', async () => {
      profileUid = null;

      await callRoute({ ids: ['a'], mode: 'tombstone' });

      expect(response.forbidden).toHaveBeenCalledTimes(1);
      expect(service.forget).not.toHaveBeenCalled();
    });

    it('returns 403 and audits the attempt when user_id names another user without manage memory', async () => {
      await callRoute({ user_id: 'other', ids: ['a', 'b'], mode: 'tombstone' });

      expect(response.forbidden).toHaveBeenCalledWith({
        body: { message: expect.stringContaining(apiPrivileges.manageMemory) },
      });
      expect(service.forget).not.toHaveBeenCalled();
      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          user: { target: { id: 'other' } },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          event: expect.objectContaining({ outcome: 'failure' }),
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
        }),
      ]);
    });

    it('forgets the memories of another user with manage memory', async () => {
      authzResult = { [apiPrivileges.manageMemory]: true };
      service.forget.mockResolvedValue({ a: 'forgotten' });

      await callRoute({ user_id: 'other', ids: ['a'], mode: 'tombstone' });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'other' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });
  });

  describe('tombstone mode', () => {
    it('forgets in the request space for the body user and answers in request order, without duplicates', async () => {
      service.forget.mockResolvedValue({ b: 'forgotten', 2: 'already_forgotten', a: 'not_found' });

      await callRoute({ user_id: 'jdoe', ids: ['b', '2', 'a', 'b'], mode: 'tombstone' });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'b',
        '2',
        'a',
      ]);
      expect(service.hardDelete).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          mode: 'tombstone',
          results: [
            { id: 'b', outcome: 'forgotten' },
            { id: '2', outcome: 'already_forgotten' },
            { id: 'a', outcome: 'not_found' },
          ],
        },
      });
    });

    it('audits each memory once, recording whose memory it was', async () => {
      service.forget.mockResolvedValue({
        a: 'forgotten',
        b: 'already_forgotten',
        c: 'not_found',
      });

      await callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'c', 'a'], mode: 'tombstone' });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'User has forgotten session memory [id=a] of user [id=jdoe]',
          event: expect.objectContaining({ action: 'session_memory_forget', outcome: 'success' }),
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'a' } },
        }),
        expect.objectContaining({
          kibana: { saved_object: { type: 'session_memory', id: 'b' } },
          event: expect.objectContaining({ outcome: 'success' }),
        }),
        expect.objectContaining({
          message: 'Failed attempt to forget session memory [id=c] of user [id=jdoe]',
          event: expect.objectContaining({ outcome: 'failure' }),
          error: expect.objectContaining({ code: 'not_found' }),
          user: { target: { id: 'jdoe' } },
          kibana: { saved_object: { type: 'session_memory', id: 'c' } },
        }),
      ]);
    });
  });

  describe('hard_delete mode', () => {
    it('hard deletes and reports per-id outcomes', async () => {
      service.hardDelete.mockResolvedValue({ a: 'deleted', b: 'not_found' });

      await callRoute({ user_id: 'jdoe', ids: ['a', 'b'], mode: 'hard_delete' });

      expect(service.hardDelete).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'a',
        'b',
      ]);
      expect(service.forget).not.toHaveBeenCalled();
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          mode: 'hard_delete',
          results: [
            { id: 'a', outcome: 'deleted' },
            { id: 'b', outcome: 'not_found' },
          ],
        },
      });
    });

    it('audits each memory as a permanent deletion', async () => {
      service.hardDelete.mockResolvedValue({ a: 'deleted', b: 'not_found' });

      await callRoute({ user_id: 'jdoe', ids: ['a', 'b'], mode: 'hard_delete' });

      expect(auditedEvents()).toEqual([
        expect.objectContaining({
          message: 'User has permanently deleted session memory [id=a] of user [id=jdoe]',
          event: expect.objectContaining({
            action: 'session_memory_hard_delete',
            type: ['deletion'],
            outcome: 'success',
          }),
        }),
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'session_memory_hard_delete',
            outcome: 'failure',
          }),
        }),
      ]);
    });
  });

  it('audits a failure for every memory and rethrows when the service throws', async () => {
    const error = new Error('shard unavailable');
    service.forget.mockRejectedValue(error);

    await expect(
      callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'a'], mode: 'tombstone' })
    ).rejects.toBe(error);

    expect(response.ok).not.toHaveBeenCalled();
    expect(auditedEvents()).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ outcome: 'failure' }),
        error: { code: 'Error', message: 'shard unavailable' },
        kibana: { saved_object: { type: 'session_memory', id: 'a' } },
      }),
      expect.objectContaining({
        event: expect.objectContaining({ outcome: 'failure' }),
        error: { code: 'Error', message: 'shard unavailable' },
        kibana: { saved_object: { type: 'session_memory', id: 'b' } },
      }),
    ]);
  });

  describe('request validation', () => {
    it('accepts a request without user_id', () => {
      expect(validateBody({ ids: ['a'] })).toEqual({ ids: ['a'], mode: 'tombstone' });
    });

    it('defaults the mode to tombstone', () => {
      expect(validateBody({ user_id: 'jdoe', ids: ['a'] })).toEqual({
        user_id: 'jdoe',
        ids: ['a'],
        mode: 'tombstone',
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
      [
        'an over-long user_id',
        { user_id: 'u'.repeat(MAX_SESSION_MEMORY_USER_ID_LENGTH + 1), ids: ['a'] },
      ],
      ['an empty id', { user_id: 'jdoe', ids: [''] }],
      ['an over-long id', { user_id: 'jdoe', ids: ['i'.repeat(MAX_SESSION_MEMORY_ID_LENGTH + 1)] }],
      ['an unknown mode', { user_id: 'jdoe', ids: ['a'], mode: 'archive' }],
    ])('rejects %s', (_name, body) => {
      expect(() => validateBody(body)).toThrow();
    });

    it('accepts the largest allowed request', () => {
      expect(() =>
        validateBody({
          user_id: 'u'.repeat(MAX_SESSION_MEMORY_USER_ID_LENGTH),
          ids: Array.from({ length: MAX_SESSION_MEMORY_FORGET_IDS }, () =>
            'i'.repeat(MAX_SESSION_MEMORY_ID_LENGTH)
          ),
          mode: 'hard_delete',
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
      it('answers 202 with a generated id and remembers the memory for the body user in the request space', async () => {
        writableIndices({ 'ai-index-ds-ops-memory': true });

        await callRoute(body);

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

      it('revises the memory named by id and returns that id', async () => {
        await callRoute({ ...body, ai_index_ids: undefined, id: 'm1' });

        expect(response.accepted).toHaveBeenCalledWith({ body: { id: 'm1' } });
        expect(remembered()[1]).toMatchObject({ id: 'm1' });
      });

      it("files the memory under the caller's profile when user_id is left out", async () => {
        await callRoute({ ...bodyWithoutUser, ai_index_ids: undefined });

        expect(remembered()[0]).toEqual({ space: 'marketing', userId: 'jdoe' });
      });

      it('returns 403 and remembers nothing for a caller without a profile and without user_id', async () => {
        profileUid = null;

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
            event: expect.objectContaining({ outcome: 'failure' }),
            user: { target: { id: 'other' } },
          }),
        ]);
      });

      it('remembers the memory of another user with manage memory', async () => {
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
        ['content over the limit', { ...body, content: tooLong(MAX_KI_CONTENT_LENGTH) }],
        ['empty content', { ...body, content: '' }],
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

        expect(auditLog.mock.calls.map(([event]) => event)).toEqual([
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
        service.remember.mockRejectedValueOnce(new Error('inference unavailable'));
      });

      it('still answers 202, logs the error with the memory id, and audits the failure', async () => {
        await callRoute({ ...body, ai_index_ids: undefined });
        await flushPromises();

        expect(response.accepted).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to remember session memory [id=${acceptedId().id}]: inference unavailable`
        );
        expect(auditLog.mock.calls.map(([event]) => event)).toEqual([
          expect.objectContaining({
            message: `Failed attempt to remember session memory [id=${
              acceptedId().id
            }] of session [id=s1]`,
            event: expect.objectContaining({ action: 'memory_remember', outcome: 'failure' }),
            error: { code: 'Error', message: 'inference unavailable' },
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
        profileUid = null;

        await callRoute({ ...bodyWithoutUser, id: 'm1' });

        expect(auditLog.mock.calls.map(([event]) => event)).toEqual([
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
        expect(auditLog.mock.calls[0][0]).not.toHaveProperty('user');
      });

      it('writes one failure event for a missing AI index, without a memory id when none was sent', async () => {
        aiIndexService.get.mockRejectedValueOnce(new AiIndexNotFoundError('ops-memory'));

        await callRoute(body);

        expect(auditLog.mock.calls.map(([event]) => event)).toEqual([
          expect.objectContaining({
            message: 'Failed attempt to remember session memory of session [id=s1]',
            event: expect.objectContaining({ outcome: 'failure' }),
            user: { target: { id: 'jdoe' } },
          }),
        ]);
        expect(auditLog.mock.calls[0][0]).not.toHaveProperty('kibana');
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
  });
});
