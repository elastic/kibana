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
    security: { authz: { requiredPrivileges: string[] } };
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

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        security: { audit: { logger: { log: auditLog } } },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(createContext(), httpServerMock.createKibanaRequest({ body }), response);

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const auditedEvents = () => auditLog.mock.calls.map(([event]) => event);

  beforeEach(() => {
    featureFlagEnabled = true;
    auditLog = jest.fn();
    response = httpServerMock.createResponseFactory();
    service = {
      remember: jest.fn(),
      get: jest.fn(),
      forget: jest.fn(),
      hardDelete: jest.fn(),
      saveEvent: jest.fn(),
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

  it('registers a public experimental route that needs the write privilege', () => {
    expect(route.config).toMatchObject({
      path: SESSION_MEMORY_FORGET_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
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
      ['a missing user_id', { ids: ['a'] }],
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
});
