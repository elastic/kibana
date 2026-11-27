/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
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
import type { SessionMemoryClient } from '../session_memory_client/client';
import { RememberCapacityError, SessionMemoryNotFoundError } from '../session_memory_client/errors';

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
  let routes: Record<string, RegisteredRoute>;
  let route: RegisteredRoute;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let client: jest.Mocked<Pick<SessionMemoryClient, 'remember' | 'forget'>>;
  let getSessionMemoryClient: jest.Mock;

  const validateBody = (body: unknown) => route.validate.request.body.validate(body);

  const callRoute = (body: Record<string, unknown>) =>
    route.handler(
      {} as Parameters<RequestHandler>[0],
      httpServerMock.createKibanaRequest({ body: validateBody(body) }),
      response
    );

  beforeEach(() => {
    response = httpServerMock.createResponseFactory();
    routes = {};
    client = {
      remember: jest.fn(async ({ id }) => ({ id: id ?? 'generated-id' })),
      forget: jest.fn(async ({ ids }) => ids.map((id) => ({ id, outcome: 'forgotten' as const }))),
    };
    getSessionMemoryClient = jest.fn(async () => client);

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

    registerSessionMemoryRoutes({ router, getSessionMemoryClient });
    route = routes[SESSION_MEMORY_FORGET_PATH];
  });

  it.each([SESSION_MEMORY_FORGET_PATH, SESSION_MEMORY_REMEMBER_PATH])(
    'registers %s as a public experimental route that needs write and declares manage memory',
    (path) => {
      expect(routes[path].config).toMatchObject({
        path,
        access: 'public',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
        options: { availability: { stability: 'experimental' } },
      });
      expect(routes[path].config.security.authz.extendedPrivileges).toEqual([
        apiPrivileges.manageMemory,
      ]);
    }
  );

  describe('_forget', () => {
    it('forgets through the client of the request and answers with its results', async () => {
      client.forget.mockResolvedValueOnce([
        { id: 'b', outcome: 'forgotten' },
        { id: 'a', outcome: 'not_found' },
        { id: 'd', outcome: 'failed', error: 'index_read_only_allow_delete_block' },
      ]);

      await callRoute({ user_id: 'jdoe', ids: ['b', 'a', 'd', 'b'] });

      expect(getSessionMemoryClient).toHaveBeenCalledTimes(1);
      expect(client.forget).toHaveBeenCalledWith({ userId: 'jdoe', ids: ['b', 'a', 'd', 'b'] });
      expect(response.ok).toHaveBeenCalledWith({
        body: {
          results: [
            { id: 'b', outcome: 'forgotten' },
            { id: 'a', outcome: 'not_found' },
            { id: 'd', outcome: 'failed', error: 'index_read_only_allow_delete_block' },
          ],
        },
      });
    });

    it('rethrows unexpected client errors', async () => {
      const error = new Error('shard unavailable');
      client.forget.mockRejectedValueOnce(error);

      await expect(callRoute({ ids: ['a'] })).rejects.toBe(error);
      expect(response.ok).not.toHaveBeenCalled();
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
        [
          'an over-long user_id',
          { user_id: 'u'.repeat(MAX_MEMORY_USER_ID_LENGTH + 1), ids: ['a'] },
        ],
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

  describe('_remember', () => {
    const body = {
      session_id: 's1',
      user_id: 'jdoe',
      ai_index_ids: ['ops-memory'],
      content: 'Root cause is a connection pool limit.',
      attributes: { incident: 'INC-4211' },
    };

    beforeEach(() => {
      route = routes[SESSION_MEMORY_REMEMBER_PATH];
    });

    it('remembers through the client of the request and answers 202 with the id', async () => {
      await callRoute({ ...body, id: 'm1' });

      expect(client.remember).toHaveBeenCalledWith({
        id: 'm1',
        sessionId: 's1',
        userId: 'jdoe',
        aiIndexIds: ['ops-memory'],
        content: body.content,
        attributes: body.attributes,
      });
      expect(response.accepted).toHaveBeenCalledWith({ body: { id: 'm1' } });
    });

    it('returns 404 when the memory to revise does not exist', async () => {
      client.remember.mockRejectedValueOnce(new SessionMemoryNotFoundError('missing-id'));

      await callRoute({ ...body, id: 'missing-id' });

      expect(response.notFound).toHaveBeenCalledWith({
        body: { message: "Session memory 'missing-id' not found" },
      });
      expect(response.accepted).not.toHaveBeenCalled();
    });

    it('returns 429 with Retry-After when too many writes are in flight', async () => {
      client.remember.mockRejectedValueOnce(new RememberCapacityError());

      await callRoute(body);

      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 429,
        body: { message: expect.stringContaining('Too many session memory writes') },
        headers: { 'Retry-After': '1' },
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
  });
});
