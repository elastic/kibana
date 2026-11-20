/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { registerSessionMemoryRoutes } from './session_memory';
import {
  MAX_MEMORY_ID_LENGTH,
  MAX_MEMORY_USER_ID_LENGTH,
  MAX_SESSION_MEMORY_FORGET_IDS,
  SESSION_MEMORY_FORGET_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
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

describe('session memory routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let auditLog: jest.Mock;
  let service: jest.Mocked<SessionMemoryService>;
  let callerUserId: string | null;
  let getProfileId: jest.Mock<Promise<string | null>>;
  let authzResult: Record<string, boolean>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
        userProfile: { getCurrentProfileId: getProfileId },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body: validateBody(body) }), {
        authzResult,
      }),
      response
    );

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  beforeEach(() => {
    featureFlagEnabled = true;
    callerUserId = 'jdoe';
    getProfileId = jest.fn(async () => callerUserId);
    authzResult = {};
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    service = {
      remember: jest.fn(),
      get: jest.fn(),
      forget: jest.fn(),
    };

    const router = {
      versioned: {
        post: jest.fn((config: RegisteredRoute['config']) => ({
          addVersion: (
            versionConfig: { validate: RegisteredRoute['validate'] },
            handler: RequestHandler
          ) => {
            route = { config, handler, validate: versionConfig.validate };
          },
        })),
      },
    } as unknown as IRouter;

    registerSessionMemoryRoutes({
      router,
      getSpaces: async () =>
        ({ spacesService: { getSpaceId: () => 'marketing' } } as unknown as SpacesPluginStart),
      getSessionMemoryService: async () => service,
    });
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
});
