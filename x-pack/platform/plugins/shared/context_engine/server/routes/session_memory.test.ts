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
  MAX_SESSION_MEMORY_FORGET_IDS,
  MAX_SESSION_MEMORY_ID_LENGTH,
  MAX_SESSION_MEMORY_USER_ID_LENGTH,
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
  validate: { request: { body: Type<unknown> } };
}

describe('session memory routes', () => {
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let auditLog: jest.Mock;
  let service: jest.Mocked<SessionMemoryService>;
  let callerUserId: string | null;
  let authzResult: Record<string, boolean>;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
        userProfile: { getCurrentProfileId: jest.fn(async () => callerUserId) },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      createContext(),
      Object.assign(httpServerMock.createKibanaRequest({ body }), { authzResult }),
      response
    );

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  beforeEach(() => {
    featureFlagEnabled = true;
    callerUserId = 'jdoe';
    authzResult = { [apiPrivileges.manageMemory]: false };
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
      service.forget.mockResolvedValue({ a: 'forgotten' });

      await callRoute({ ids: ['a'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when user_id is missing and the caller has no profile', async () => {
      callerUserId = null;

      await callRoute({ ids: ['a'] });

      expect(response.forbidden).toHaveBeenCalledTimes(1);
      expect(service.forget).not.toHaveBeenCalled();
    });

    it('returns 403 and audits the attempt when user_id names another user without manage memory', async () => {
      await callRoute({ user_id: 'other', ids: ['a', 'b'] });

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

      await callRoute({ user_id: 'other', ids: ['a'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'other' }, ['a']);
      expect(response.ok).toHaveBeenCalledTimes(1);
    });
  });

  describe('forgetting', () => {
    it('forgets in the request space for the body user and answers in request order, without duplicates', async () => {
      service.forget.mockResolvedValue({ b: 'forgotten', 2: 'already_forgotten', a: 'not_found' });

      await callRoute({ user_id: 'jdoe', ids: ['b', '2', 'a', 'b'] });

      expect(service.forget).toHaveBeenCalledWith({ space: 'marketing', userId: 'jdoe' }, [
        'b',
        '2',
        'a',
      ]);
      expect(response.ok).toHaveBeenCalledWith({
        body: {
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

      await callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'c', 'a'] });

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

  it('audits a failure for every memory and rethrows when the service throws', async () => {
    const error = new Error('shard unavailable');
    service.forget.mockRejectedValue(error);

    await expect(callRoute({ user_id: 'jdoe', ids: ['a', 'b', 'a'] })).rejects.toBe(error);

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
      [
        'an over-long user_id',
        { user_id: 'u'.repeat(MAX_SESSION_MEMORY_USER_ID_LENGTH + 1), ids: ['a'] },
      ],
      ['an empty id', { user_id: 'jdoe', ids: [''] }],
      ['an over-long id', { user_id: 'jdoe', ids: ['i'.repeat(MAX_SESSION_MEMORY_ID_LENGTH + 1)] }],
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
        })
      ).not.toThrow();
    });
  });
});
