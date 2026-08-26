/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerA2ARoutes, A2A_SERVER_PATH } from './a2a';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';
import type { RouteDependencies } from './types';

describe('A2A routes - socket timeout', () => {
  // Kibana's default `server.socketTimeout` (src/core/packages/http/server-internal/src/http_config.ts).
  // An `idleSocket` override only fixes the "A2A request killed mid-execution" bug if it is actually
  // larger than this default; otherwise the route falls back to it and the bug reproduces.
  const DEFAULT_SERVER_SOCKET_TIMEOUT_MS = 120 * 1000;

  let postRouteConfig: { path: string; options?: { timeout?: { idleSocket?: number } } };

  beforeEach(() => {
    postRouteConfig = undefined as unknown as typeof postRouteConfig;

    const versionedPost = jest.fn().mockImplementation((config) => {
      postRouteConfig = config;
      return { addVersion: jest.fn() };
    });

    const mockRouter = {
      versioned: {
        get: jest.fn().mockReturnValue({ addVersion: jest.fn() }),
        post: versionedPost,
      },
    } as unknown as jest.Mocked<IRouter>;

    registerA2ARoutes({
      router: mockRouter,
      logger: loggingSystemMock.createLogger(),
      getInternalServices: jest.fn(),
      coreSetup: {} as RouteDependencies['coreSetup'],
      pluginsSetup: {} as RouteDependencies['pluginsSetup'],
    } as unknown as RouteDependencies);
  });

  it('registers the send-task route at the expected path', () => {
    expect(postRouteConfig.path).toBe(`${A2A_SERVER_PATH}/{agentId}`);
  });

  it('overrides the idle socket timeout so long-running agent executions are not killed mid-request', () => {
    expect(postRouteConfig.options?.timeout?.idleSocket).toBe(AGENT_SOCKET_TIMEOUT_MS);
  });

  it('sets an idle socket timeout greater than the server default, since A2A responses are synchronous and can outlive it', () => {
    expect(postRouteConfig.options?.timeout?.idleSocket).toBeGreaterThan(
      DEFAULT_SERVER_SOCKET_TIMEOUT_MS
    );
  });
});
