/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { timeoutSignal } from '@kbn/std';

import { createMockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerCloudStackVersionsRoute } from './cloud_stack_versions';

jest.mock('@kbn/std', () => {
  const actual = jest.requireActual('@kbn/std');
  return {
    ...actual,
    timeoutSignal: jest.fn((...args: unknown[]) => actual.timeoutSignal(...args)),
  };
});

const asArrayBuffer = (body: unknown): ArrayBuffer => {
  const bytes = Buffer.from(JSON.stringify(body));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const createFetchResponse = (status: number, body: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: new Headers(),
    arrayBuffer: async () => asArrayBuffer(body),
  } as unknown as Response;
};

const createOkResponse = (body: unknown): Response => createFetchResponse(200, body);

const createErrorResponse = (status: number): Response => createFetchResponse(status, {});

const createErrorResponseWithBody = (status: number, body: unknown): Response =>
  createFetchResponse(status, body);

describe('Cloud stack versions API', () => {
  const log = { error: jest.fn() };
  const cloudStackVersionsApiBaseUrl = 'https://cloud.example.test/api/stack/versions';

  const trackDisposals = () => {
    const disposals: Array<{ timeoutMs: number; aborted: boolean }> = [];
    (timeoutSignal as jest.Mock).mockImplementation((timeoutMs: number) => {
      const signal = jest
        .requireActual<typeof import('@kbn/std')>('@kbn/std')
        .timeoutSignal(timeoutMs);
      const dispose = signal.dispose.bind(signal);
      Object.defineProperty(signal, 'dispose', {
        configurable: true,
        value: () => {
          disposals.push({ timeoutMs, aborted: signal.aborted });
          dispose();
        },
      });
      return signal;
    });
    return disposals;
  };

  const invokeCloudStackVersions = async (currentVersion: string) => {
    const mockRouter = createMockRouter();
    const routeDependencies: any = {
      router: mockRouter,
      log,
      config: { cloudStackVersionsApiBaseUrl },
    };
    registerCloudStackVersionsRoute(routeDependencies);
    return routeDependencies.router.getHandler({
      method: 'get',
      pathPattern: '/api/upgrade_assistant/cloud_stack_versions/{currentVersion}',
    })(
      routeHandlerContextMock,
      createRequestMock({ params: { currentVersion } }),
      kibanaResponseFactory
    );
  };
  let originalFetchDescriptor: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, 'fetch', { value: jest.fn(), writable: true });
    // resetAllMocks() drops the factory implementation between tests.
    (timeoutSignal as jest.Mock).mockImplementation((timeoutMs: number) =>
      jest.requireActual<typeof import('@kbn/std')>('@kbn/std').timeoutSignal(timeoutMs)
    );
  });

  afterEach(() => {
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, 'fetch', originalFetchDescriptor);
    } else {
      delete (globalThis as unknown as { fetch?: unknown }).fetch;
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

    const timeoutMsCalls = (timeoutSignal as jest.Mock).mock.calls.map(([ms]) => ms);
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

  it('reads a successful body before disposing the deadline', async () => {
    const disposals = trackDisposals();
    const fetchMock = global.fetch as unknown as jest.Mock;
    let readWhileDeadlineWasLive = false;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      arrayBuffer: async () => {
        const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
        readWhileDeadlineWasLive = disposals.length === 0 && !signal.aborted;
        return asArrayBuffer({ upgradable_to: [] });
      },
    });

    const resp = await invokeCloudStackVersions('8.17.0');

    expect(resp.status).toEqual(200);
    expect(readWhileDeadlineWasLive).toBe(true);
    expect(disposals.map(({ timeoutMs }) => timeoutMs).sort((a, b) => a - b)).toEqual([
      5_000, 30_000,
    ]);
    expect(disposals.every(({ aborted }) => !aborted)).toBe(true);
  });

  it('cancels a non-OK body instead of buffering it, then disposes the deadline', async () => {
    const disposals = trackDisposals();
    const fetchMock = global.fetch as unknown as jest.Mock;
    const cancel = jest.fn(async () => undefined);
    let buffered = false;
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers(),
      body: { cancel },
      arrayBuffer: async () => {
        buffered = true;
        return asArrayBuffer({});
      },
    });

    const resp = await invokeCloudStackVersions('8.17.0');

    expect(resp.status).toEqual(502);
    expect(buffered).toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(disposals.map(({ timeoutMs }) => timeoutMs).sort((a, b) => a - b)).toEqual([
      5_000, 30_000,
    ]);
  });

  it('keeps the 5 second deadline active until a slow body aborts', async () => {
    jest.useFakeTimers();
    try {
      const disposals = trackDisposals();
      const fetchMock = global.fetch as unknown as jest.Mock;
      fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
        const signal = init?.signal;
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          arrayBuffer: () =>
            new Promise<ArrayBuffer>((_resolve, reject) => {
              if (!signal) {
                reject(new Error('missing signal'));
                return;
              }
              if (signal.aborted) {
                reject(signal.reason);
                return;
              }
              signal.addEventListener('abort', () => reject(signal.reason), { once: true });
            }),
        } as unknown as Response;
      });

      const pending = invokeCloudStackVersions('8.17.0');
      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(5_000);
      const resp = await pending;

      expect(resp.status).toEqual(502);
      expect(disposals).toContainEqual({ timeoutMs: 5_000, aborted: true });
      expect(disposals).toContainEqual({ timeoutMs: 30_000, aborted: false });
    } finally {
      jest.useRealTimers();
    }
  });
});
