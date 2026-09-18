/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { DeclarativeCatalogHealth } from './types';
import { registerDeclarativeCatalogRoutes } from './catalog_routes';
import type { DeclarativeCatalogService } from './catalog_service';

const healthy = (): DeclarativeCatalogHealth => ({
  enabled: true,
  ready: true,
  sourceUrl: 'http://127.0.0.1:8089',
  activeCatalogVersion: 'sha256:72f5f754750fbdc435db7567e208a1ebffebe4dff5633f401457fea29d2e8e95',
  versions: [
    { id: '.abuseipdb', version: '1.1.0', status: 'active' },
    { id: '.okta', version: '1.0.0', status: 'active' },
  ],
  registeredTypeIds: ['.abuseipdb', '.okta'],
  registeredVersionsByType: {
    '.abuseipdb': { activeVersion: '1.1.0', versions: ['1.1.0'] },
    '.okta': { activeVersion: '1.0.0', versions: ['1.0.0'] },
  },
  incompatibleVersions: [],
  pinnedVersionsMissing: [],
  skipped: [],
  lastRefreshAt: '2026-09-17T12:00:00.000Z',
  indexReady: true,
  indexCatalogVersion: 'sha256:72f5f754750fbdc435db7567e208a1ebffebe4dff5633f401457fea29d2e8e95',
});

const createService = (
  overrides: Partial<DeclarativeCatalogService> = {}
): DeclarativeCatalogService =>
  ({
    getHealth: jest.fn().mockReturnValue(healthy()),
    refresh: jest.fn().mockResolvedValue(undefined),
    start: jest.fn(),
    stop: jest.fn(),
    ...overrides,
  } as unknown as DeclarativeCatalogService);

describe('registerDeclarativeCatalogRoutes', () => {
  it('returns service health from GET _health', async () => {
    const router = httpServiceMock.createRouter();
    const service = createService();
    registerDeclarativeCatalogRoutes({ router, service });

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toBe('/internal/stack_connectors/declarative_catalog/_health');
    expect(config.validate).toBe(false);
    expect(config.options).toEqual({ access: 'internal' });

    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: healthy() });
  });

  it('returns the degraded health body from GET _health', async () => {
    const router = httpServiceMock.createRouter();
    const degraded: DeclarativeCatalogHealth = {
      enabled: true,
      ready: false,
      sourceUrl: 'http://127.0.0.1:8089',
      versions: [],
      registeredTypeIds: [],
      registeredVersionsByType: {},
      incompatibleVersions: [],
      pinnedVersionsMissing: [],
      skipped: [],
      lastError: { message: 'connect ECONNREFUSED', at: '2026-09-17T12:00:01.000Z' },
      indexReady: false,
    };
    const service = createService({
      getHealth: jest.fn().mockReturnValue(degraded),
    });
    registerDeclarativeCatalogRoutes({ router, service });

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        ready: false,
        registeredTypeIds: [],
        lastError: expect.objectContaining({ message: 'connect ECONNREFUSED' }),
      }),
    });
  });

  it('refreshes then returns health from POST _refresh', async () => {
    const router = httpServiceMock.createRouter();
    const service = createService();
    registerDeclarativeCatalogRoutes({ router, service });

    const [config, handler] = router.post.mock.calls[0];
    expect(config.path).toBe('/internal/stack_connectors/declarative_catalog/_refresh');

    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(service.refresh).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({ body: healthy() });
  });

  it('returns health instead of a 500 when refresh() rejects', async () => {
    const router = httpServiceMock.createRouter();
    const degraded: DeclarativeCatalogHealth = {
      ...healthy(),
      ready: true,
      registeredTypeIds: ['.abuseipdb'],
      lastError: { message: 'connect ECONNREFUSED', at: '2026-09-17T12:00:01.000Z' },
    };
    const service = createService({
      refresh: jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')),
      getHealth: jest.fn().mockReturnValue(degraded),
    });
    registerDeclarativeCatalogRoutes({ router, service });

    const [, handler] = router.post.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: degraded });
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('reports ready when types came from the index even if a later refresh failed', async () => {
    const router = httpServiceMock.createRouter();
    const degradedRefresh: DeclarativeCatalogHealth = {
      ...healthy(),
      ready: true,
      lastError: { message: 'connect ECONNREFUSED', at: '2026-09-17T12:00:01.000Z' },
    };
    const service = createService({
      getHealth: jest.fn().mockReturnValue(degradedRefresh),
    });
    registerDeclarativeCatalogRoutes({ router, service });

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        ready: true,
        indexReady: true,
        registeredTypeIds: ['.abuseipdb', '.okta'],
        lastError: expect.objectContaining({ message: 'connect ECONNREFUSED' }),
      }),
    });
  });

  it('reports not ready when the fleet is empty and no type was registered', async () => {
    const router = httpServiceMock.createRouter();
    const emptyFleet: DeclarativeCatalogHealth = {
      enabled: true,
      ready: false,
      sourceUrl: 'http://127.0.0.1:8089',
      versions: [],
      registeredTypeIds: [],
      registeredVersionsByType: {},
      incompatibleVersions: [],
      pinnedVersionsMissing: [],
      skipped: [],
      lastError: { message: 'ENOENT: snapshot missing', at: '2026-09-17T12:00:01.000Z' },
      indexReady: false,
    };
    const service = createService({
      getHealth: jest.fn().mockReturnValue(emptyFleet),
    });
    registerDeclarativeCatalogRoutes({ router, service });

    const [, handler] = router.get.mock.calls[0];
    const response = httpServerMock.createResponseFactory();
    await handler({}, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        ready: false,
        indexReady: false,
        registeredTypeIds: [],
        lastError: expect.objectContaining({ message: 'ENOENT: snapshot missing' }),
      }),
    });
  });
});
