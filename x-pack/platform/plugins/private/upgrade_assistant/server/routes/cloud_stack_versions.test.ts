/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';

import { createMockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerCloudStackVersionsRoute } from './cloud_stack_versions';

const createOkResponse = (body: unknown): Response => {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
};

const createErrorResponse = (status: number): Response => {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
};

const createErrorResponseWithBody = (status: number, body: unknown): Response => {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
};

describe('Cloud stack versions API', () => {
  const log = { error: jest.fn() };
  const cloudStackVersionsApiBaseUrl = 'https://cloud.example.test/api/stack/versions';
  let originalFetchDescriptor: PropertyDescriptor | undefined;
  let originalAbortSignalTimeout: ((timeoutMs: number) => AbortSignal) | undefined;
  let abortSignalHadOwnTimeout: boolean;

  beforeAll(() => {
    originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
    abortSignalHadOwnTimeout = Object.prototype.hasOwnProperty.call(AbortSignal, 'timeout');
    originalAbortSignalTimeout = abortSignalHadOwnTimeout
      ? (AbortSignal as unknown as { timeout: (timeoutMs: number) => AbortSignal }).timeout
      : undefined;
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), writable: true });

    (AbortSignal as unknown as { timeout: (timeoutMs: number) => AbortSignal }).timeout = jest.fn(
      (timeoutMs: number) => {
        const signal = new AbortController().signal as AbortSignal & { __timeoutMs?: number };
        signal.__timeoutMs = timeoutMs;
        return signal;
      }
    );
  });

  afterEach(() => {
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
    } else {
      delete (globalThis as unknown as { fetch?: unknown }).fetch;
    }

    if (abortSignalHadOwnTimeout) {
      (AbortSignal as unknown as { timeout: (timeoutMs: number) => AbortSignal }).timeout =
        originalAbortSignalTimeout!;
    } else {
      delete (AbortSignal as unknown as { timeout?: unknown }).timeout;
    }

    jest.resetAllMocks();
  });

  it('returns latest available version, first hop min version, and direct upgrade range', async () => {
    const mockRouter = createMockRouter();
    const routeDependencies: any = {
      router: mockRouter,
      log,
      config: { cloudStackVersionsApiBaseUrl },
    };
    registerCloudStackVersionsRoute(routeDependencies);

    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock
      .mockResolvedValueOnce(
        createOkResponse({
          upgradable_to: ['8.17.1', '8.19.13', 'not-a-version'],
        })
      )
      .mockResolvedValueOnce(
        createOkResponse({
          upgradable_to: ['9.3.2'],
        })
      )
      .mockResolvedValueOnce(
        createOkResponse({
          upgradable_to: [],
        })
      );

    const resp = await routeDependencies.router.getHandler({
      method: 'get',
      pathPattern: '/api/upgrade_assistant/cloud_stack_versions/{currentVersion}',
    })(
      routeHandlerContextMock,
      createRequestMock({ params: { currentVersion: '8.17.0' } }),
      kibanaResponseFactory
    );

    expect(resp.status).toEqual(200);
    expect(resp.payload).toEqual({
      currentVersion: '8.17.0',
      lookupVersionUsed: '9.3.2',
      latestAvailableVersion: '9.3.2',
      minVersionToUpgradeToLatest: '8.19.13',
      directUpgradeableVersionRange: { min: '8.17.1', max: '8.19.13' },
    });

    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { accept: 'application/json' },
      signal: expect.any(Object),
    });

    const abortSignalTimeoutMock = AbortSignal.timeout as unknown as jest.Mock;
    const timeoutMsCalls = abortSignalTimeoutMock.mock.calls.map(([ms]) => ms);
    expect(timeoutMsCalls.filter((ms) => ms === 30_000)).toHaveLength(1);
    expect(timeoutMsCalls.filter((ms) => ms === 5_000)).toHaveLength(fetchMock.mock.calls.length);
  });

  it.each([404, 400])(
    'falls back to the best published version when Cloud responds with stackpack.version_not_found (status %s)',
    async (status) => {
      const mockRouter = createMockRouter();
      const routeDependencies: any = {
        router: mockRouter,
        log,
        config: { cloudStackVersionsApiBaseUrl },
      };
      registerCloudStackVersionsRoute(routeDependencies);

      const fetchMock = global.fetch as unknown as jest.Mock;
      fetchMock
        .mockResolvedValueOnce(
          createErrorResponseWithBody(status, {
            errors: [
              {
                code: 'stackpack.version_not_found',
                message: "The Elastic Stack version '8.19.99' was not found",
              },
            ],
          })
        )
        // Fetch published stacks list
        .mockResolvedValueOnce(
          createOkResponse({
            stacks: [{ version: '8.17.1' }, { version: '8.19.13' }, { version: '9.3.2' }],
          })
        )
        // Fallback version lookup (8.19.13)
        .mockResolvedValueOnce(createOkResponse({ upgradable_to: ['9.3.2'] }))
        // Final lookup (9.3.2)
        .mockResolvedValueOnce(createOkResponse({ upgradable_to: [] }));

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/cloud_stack_versions/{currentVersion}',
      })(
        routeHandlerContextMock,
        // Requested version may be "under development" and not published in Cloud yet
        createRequestMock({ params: { currentVersion: '8.19.99' } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        currentVersion: '8.19.99',
        lookupVersionUsed: '9.3.2',
        latestAvailableVersion: '9.3.2',
        minVersionToUpgradeToLatest: undefined,
        directUpgradeableVersionRange: { min: '9.3.2', max: '9.3.2' },
      });
    }
  );

  it('attempts to look up the requested stable x.y.z first', async () => {
    const mockRouter = createMockRouter();
    const routeDependencies: any = {
      router: mockRouter,
      log,
      config: { cloudStackVersionsApiBaseUrl },
    };
    registerCloudStackVersionsRoute(routeDependencies);

    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValueOnce(createOkResponse({ upgradable_to: [] }));

    await routeDependencies.router.getHandler({
      method: 'get',
      pathPattern: '/api/upgrade_assistant/cloud_stack_versions/{currentVersion}',
    })(
      routeHandlerContextMock,
      createRequestMock({ params: { currentVersion: '8.19.0' } }),
      kibanaResponseFactory
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/8.19.0');
  });

  it('returns 502 when the initial Cloud lookup fails (e.g. Cloud is unreachable)', async () => {
    const mockRouter = createMockRouter();
    const routeDependencies: any = {
      router: mockRouter,
      log,
      config: { cloudStackVersionsApiBaseUrl },
    };
    registerCloudStackVersionsRoute(routeDependencies);

    const fetchMock = global.fetch as unknown as jest.Mock;
    fetchMock.mockResolvedValueOnce(createErrorResponse(503));

    const resp = await routeDependencies.router.getHandler({
      method: 'get',
      pathPattern: '/api/upgrade_assistant/cloud_stack_versions/{currentVersion}',
    })(
      routeHandlerContextMock,
      createRequestMock({ params: { currentVersion: '8.17.0' } }),
      kibanaResponseFactory
    );

    expect(resp.status).toEqual(502);
    expect(resp.payload).toEqual({ message: 'Failed to retrieve stack versions from Cloud.' });
    expect(log.error).toHaveBeenCalled();
  });
});
