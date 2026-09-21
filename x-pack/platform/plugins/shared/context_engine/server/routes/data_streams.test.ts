/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { registerDataStreamsRoutes } from './data_streams';
import { dataStreamsSearchPath, MAX_DATA_STREAM_SEARCH_RESULTS } from '../../common/constants';
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

describe('data streams routes', () => {
  let routes: Record<string, RegisteredRoute>;
  let response: ReturnType<typeof httpServerMock.createResponseFactory>;
  let featureFlagEnabled: boolean;
  let getDataStream: jest.Mock;

  const createContext = () =>
    ({
      core: Promise.resolve({
        uiSettings: {
          client: { get: jest.fn().mockImplementation(async () => featureFlagEnabled) },
        },
        elasticsearch: {
          client: { asCurrentUser: { indices: { getDataStream } } },
        },
      }),
    }) as unknown as Parameters<RequestHandler>[0];

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
    getDataStream = jest.fn().mockResolvedValue({ data_streams: [] });

    const createVersionedRoute = (method: string) => (config: RegisteredRoute['config']) => ({
      addVersion: (versionConfig: { validate: unknown }, handler: RequestHandler) => {
        routes[`${method}:${config.path}`] = { config, handler, validate: versionConfig.validate };
      },
    });

    const router = {
      versioned: { get: jest.fn(createVersionedRoute('GET')) },
    } as unknown as IRouter;

    registerDataStreamsRoutes({ router });
  });

  it('registers the route as an internal read route', () => {
    expect(getRoute(dataStreamsSearchPath).config).toMatchObject({
      access: 'internal',
      security: { authz: { requiredPrivileges: [apiPrivileges.readContextEngine] } },
    });
  });

  it('returns 404 when the context engine is disabled', async () => {
    featureFlagEnabled = false;

    await callRoute(dataStreamsSearchPath, {});

    expect(response.notFound).toHaveBeenCalledTimes(1);
    expect(getDataStream).not.toHaveBeenCalled();
  });

  it('lists all data streams when search is omitted', async () => {
    getDataStream.mockResolvedValue({ data_streams: [{ name: 'logs-genai-default' }] });

    await callRoute(dataStreamsSearchPath, { query: {} });

    expect(getDataStream).toHaveBeenCalledWith({ name: '*', expand_wildcards: 'all' });
    expect(response.ok).toHaveBeenCalledWith({
      body: { dataStreams: ['logs-genai-default'] },
    });
  });

  it('wraps the search term in wildcards', async () => {
    getDataStream.mockResolvedValue({ data_streams: [{ name: 'logs-genai-default' }] });

    await callRoute(dataStreamsSearchPath, { query: { search: 'lo' } });

    expect(getDataStream).toHaveBeenCalledWith({ name: '*lo*', expand_wildcards: 'all' });
  });

  it('filters out hidden data streams and preserves ES order', async () => {
    getDataStream.mockResolvedValue({
      data_streams: [
        { name: 'zeta-stream' },
        { name: 'hidden-stream', hidden: true },
        { name: 'managed-stream', _meta: { managed: true } },
        { name: 'alpha-stream', hidden: false },
      ],
    });

    await callRoute(dataStreamsSearchPath, { query: {} });

    expect(response.ok).toHaveBeenCalledWith({
      body: { dataStreams: ['zeta-stream', 'managed-stream', 'alpha-stream'] },
    });
  });

  it('caps results when more matches survive filtering', async () => {
    const extra = 3;
    const dataStreams = Array.from({ length: MAX_DATA_STREAM_SEARCH_RESULTS + extra }, (_, i) => ({
      name: `ds-${String(i).padStart(3, '0')}`,
    }));
    getDataStream.mockResolvedValue({ data_streams: dataStreams });

    await callRoute(dataStreamsSearchPath, { query: {} });

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        dataStreams: dataStreams.slice(0, MAX_DATA_STREAM_SEARCH_RESULTS).map((ds) => ds.name),
      },
    });
  });
});
