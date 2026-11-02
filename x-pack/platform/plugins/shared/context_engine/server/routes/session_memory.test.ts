/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  SESSION_EVENTS_BY_SESSION_PATH,
  SESSION_EVENTS_SAVE_PATH,
  SESSION_MEMORY_BY_SESSION_PATH,
  SESSION_MEMORY_REMEMBER_PATH,
  SESSION_MEMORY_SEARCH_PATH,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { registerSessionMemoryRoutes } from './session_memory';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: unknown;
}

const scope = { session_id: 's-1', user_id: 'u-1', agent_id: 'a-1' };

describe('session memory routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let memoryEnabled: boolean;
  let transportRequest: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: {
          client: { asInternalUser: { transport: { request: transportRequest } } },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (method: string, path: string): RegisteredRoute => {
    const route = routes[`${method}:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (method: string, path: string, request: Record<string, unknown>) => {
    const { handler } = getRoute(method, path);
    return handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  beforeEach(() => {
    routes = {};
    featureFlagEnabled = true;
    memoryEnabled = true;
    response = httpServerMock.createResponseFactory();
    transportRequest = jest.fn();

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (versionConfig: { validate: unknown }, handler: RequestHandler) => {
        routes[`${method}:${config.path}`] = { config, handler, validate: versionConfig.validate };
      },
    });

    const router = {
      versioned: {
        get: jest.fn(createVersionedRoute('GET')),
        post: jest.fn(createVersionedRoute('POST')),
      },
    } as unknown as IRouter;

    registerSessionMemoryRoutes({
      router,
      logger: loggingSystemMock.createLogger(),
      isMemoryEnabled: async () => memoryEnabled,
    });
  });

  it('registers writes as write routes and reads as read routes, all internal', () => {
    for (const path of [SESSION_MEMORY_REMEMBER_PATH, SESSION_EVENTS_SAVE_PATH]) {
      expect(getRoute('POST', path).config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] } },
      });
    }
    expect(getRoute('POST', SESSION_MEMORY_SEARCH_PATH).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    for (const path of [SESSION_MEMORY_BY_SESSION_PATH, SESSION_EVENTS_BY_SESSION_PATH]) {
      expect(getRoute('GET', path).config).toMatchObject({
        access: 'internal',
        security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
      });
    }
  });

  it('returns 404 on every route when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute('POST', SESSION_MEMORY_REMEMBER_PATH, { body: { ...scope, content: 'x' } });
    await callRoute('POST', SESSION_MEMORY_SEARCH_PATH, { body: { query: 'x' } });
    await callRoute('GET', SESSION_MEMORY_BY_SESSION_PATH, { params: { sessionId: 's-1' } });
    await callRoute('POST', SESSION_EVENTS_SAVE_PATH, { body: { ...scope, transcript: 'x' } });
    await callRoute('GET', SESSION_EVENTS_BY_SESSION_PATH, { params: { sessionId: 's-1' } });

    expect(response.notFound).toHaveBeenCalledTimes(5);
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('returns 404 on every route when memory is disabled', async () => {
    memoryEnabled = false;

    await callRoute('POST', SESSION_MEMORY_REMEMBER_PATH, { body: { ...scope, content: 'x' } });
    await callRoute('POST', SESSION_MEMORY_SEARCH_PATH, { body: { query: 'x' } });
    await callRoute('GET', SESSION_MEMORY_BY_SESSION_PATH, { params: { sessionId: 's-1' } });
    await callRoute('POST', SESSION_EVENTS_SAVE_PATH, { body: { ...scope, transcript: 'x' } });
    await callRoute('GET', SESSION_EVENTS_BY_SESSION_PATH, { params: { sessionId: 's-1' } });

    expect(response.notFound).toHaveBeenCalledTimes(5);
    expect(transportRequest).not.toHaveBeenCalled();
  });

  it('proxies remember to ES as the internal user and returns the stored memory', async () => {
    const body = { ...scope, content: 'Prefers dark mode', media: [] };
    const stored = { ...body, id: 'm-1', '@timestamp': '2026-01-01T00:00:00.000Z' };
    transportRequest.mockResolvedValue(stored);

    await callRoute('POST', SESSION_MEMORY_REMEMBER_PATH, { body });

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_context_engine/session_memory/_remember',
      body,
    });
    expect(response.ok).toHaveBeenCalledWith({ body: stored });
  });

  it('proxies search to ES with the filters and size', async () => {
    const body = { query: 'dark mode', user_id: 'u-1', size: 5 };
    const hits = { count: 1, results: [{ _score: 0.9, memory: { id: 'm-1' } }] };
    transportRequest.mockResolvedValue(hits);

    await callRoute('POST', SESSION_MEMORY_SEARCH_PATH, { body });

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_context_engine/session_memory/_search',
      body,
    });
    expect(response.ok).toHaveBeenCalledWith({ body: hits });
  });

  it('lists a session’s memories with the scope filters as a querystring', async () => {
    transportRequest.mockResolvedValue({ count: 0, results: [] });

    await callRoute('GET', SESSION_MEMORY_BY_SESSION_PATH, {
      params: { sessionId: 'session/one' },
      query: { space: 'default', ai_index_id: 'idx', size: 10 },
    });

    expect(transportRequest).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_context_engine/session_memory/session%2Fone',
      querystring: { space: 'default', ai_index_id: 'idx', size: 10 },
    });
    expect(response.ok).toHaveBeenCalledWith({ body: { count: 0, results: [] } });
  });

  it('proxies save event and lists a session’s events', async () => {
    const body = { ...scope, round_id: 'r-1', transcript: 'user: hi' };
    transportRequest.mockResolvedValueOnce({ ...body, id: 'e-1' });
    transportRequest.mockResolvedValueOnce({ count: 1, results: [{ ...body, id: 'e-1' }] });

    await callRoute('POST', SESSION_EVENTS_SAVE_PATH, { body });
    await callRoute('GET', SESSION_EVENTS_BY_SESSION_PATH, {
      params: { sessionId: 's-1' },
      query: { size: 100 },
    });

    expect(transportRequest).toHaveBeenNthCalledWith(1, {
      method: 'POST',
      path: '/_context_engine/session_events/_save',
      body,
    });
    expect(transportRequest).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/_context_engine/session_events/s-1',
      querystring: { size: 100 },
    });
    expect(response.ok).toHaveBeenCalledTimes(2);
  });

  it('forwards an ES validation error with its status and reason', async () => {
    transportRequest.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 400,
        body: {
          error: {
            type: 'action_request_validation_exception',
            reason: 'Validation Failed: 1: [content] or [media] is required;',
          },
        },
        warnings: null,
        meta: {} as never,
      })
    );

    await callRoute('POST', SESSION_MEMORY_REMEMBER_PATH, { body: { ...scope, content: 'x' } });

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 400,
      body: {
        message:
          'action_request_validation_exception: Validation Failed: 1: [content] or [media] is required;',
      },
    });
  });

  it('rejects a remember body with neither content nor media', () => {
    const { validate } = getRoute('POST', SESSION_MEMORY_REMEMBER_PATH);
    const bodySchema = (validate as { request: { body: { validate: (v: unknown) => unknown } } })
      .request.body;

    expect(() => bodySchema.validate({ ...scope, content: '  ' })).toThrow(/\[content\]/);
    expect(() => bodySchema.validate({ ...scope, content: 'hello' })).not.toThrow();
    expect(() =>
      bodySchema.validate({
        ...scope,
        media: [{ type: 'image', value: 'data:image/png;base64,AA' }],
      })
    ).not.toThrow();
    expect(() => bodySchema.validate({ ...scope, '@timestamp': 'now', content: 'x' })).toThrow();
  });

  it('accepts a text or media search query and defaults the size', () => {
    const { validate } = getRoute('POST', SESSION_MEMORY_SEARCH_PATH);
    const bodySchema = (validate as { request: { body: { validate: (v: unknown) => unknown } } })
      .request.body;

    expect(bodySchema.validate({ query: 'dark mode' })).toEqual({ query: 'dark mode', size: 10 });
    expect(() =>
      bodySchema.validate({ query: { type: 'image', value: 'data:image/png;base64,AA' } })
    ).not.toThrow();
    expect(() => bodySchema.validate({ query: '' })).toThrow();
    expect(() => bodySchema.validate({ query: 'x', size: 101 })).toThrow();
  });
});
