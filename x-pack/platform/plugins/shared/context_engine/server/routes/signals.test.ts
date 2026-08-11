/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { registerSignalRoutes } from './signals';
import { signalGroupsPath, signalsPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';

interface RegisteredRoute {
  config: {
    path: string;
    access: string;
    security: { authz: { requiredPrivileges: string[] } };
  };
  handler: RequestHandler;
  validate: unknown;
}

describe('signals routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let search: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: {
          client: { asCurrentUser: { search } },
        },
      }),
    } as unknown as Parameters<RequestHandler>[0]);

  const getRoute = (path: string): RegisteredRoute => {
    const route = routes[`GET:${path}`];
    expect(route).toBeDefined();
    return route;
  };

  const callRoute = async (path: string, request: Record<string, unknown>) => {
    const { handler } = getRoute(path);
    return handler(createContext(), httpServerMock.createKibanaRequest(request), response);
  };

  beforeEach(() => {
    routes = {};
    featureFlagEnabled = true;
    response = httpServerMock.createResponseFactory();
    search = jest.fn();

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (versionConfig: { validate: unknown }, handler: RequestHandler) => {
        routes[`${method}:${config.path}`] = { config, handler, validate: versionConfig.validate };
      },
    });

    const router = {
      versioned: { get: jest.fn(createVersionedRoute('GET')) },
    } as unknown as IRouter;

    registerSignalRoutes({ router });
  });

  it('registers both routes as internal read routes', () => {
    expect(getRoute(signalGroupsPath).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
    expect(getRoute(signalsPath).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
  });

  it('returns 404 on every route when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(signalGroupsPath, {});
    await callRoute(signalsPath, { query: { tag: 'query_error', from: 0, size: 25 } });

    expect(response.notFound).toHaveBeenCalledTimes(2);
    expect(search).not.toHaveBeenCalled();
  });

  it('aggregates by tag and reads as the current user', async () => {
    search.mockResolvedValue({
      aggregations: { tags: { buckets: [{ key: 'query_error', doc_count: 5 }] } },
    });

    await callRoute(signalGroupsPath, {});

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'context-engine-signals-*',
        aggs: { tags: { terms: expect.objectContaining({ field: 'tags' }) } },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { groups: [{ tag: 'query_error', count: 5 }] },
    });
  });

  it('fetches the signals for a tag', async () => {
    const signal = { signal_id: 'sig-1', tags: ['query_error'], data: {} };
    search.mockResolvedValue({ hits: { total: { value: 1 }, hits: [{ _source: signal }] } });

    await callRoute(signalsPath, { query: { tag: 'query_error', from: 0, size: 25 } });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'context-engine-signals-*',
        query: { term: { tags: 'query_error' } },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { signals: [signal], total: 1 } });
  });
});
