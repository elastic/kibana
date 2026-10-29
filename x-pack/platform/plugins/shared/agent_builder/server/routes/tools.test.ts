/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { z } from '@kbn/zod/v4';
import { registerToolsRoutes } from './tools';
import type { RouteDependencies } from './types';

describe('POST /tools/_execute', () => {
  const executePath = '/api/agent_builder/tools/_execute';
  let handler: Function;
  let registry: { get: jest.Mock; execute: jest.Mock };
  let response: { ok: jest.Mock; badRequest: jest.Mock };

  beforeEach(() => {
    registry = {
      get: jest.fn().mockResolvedValue({
        getSchema: jest
          .fn()
          .mockResolvedValue(
            z.object({ query: z.string(), types: z.array(z.string()).optional() })
          ),
      }),
      execute: jest.fn().mockResolvedValue({ results: [] }),
    };
    response = { ok: jest.fn(), badRequest: jest.fn() };

    const versionedRoute = { addVersion: jest.fn() };
    const capture = (routeConfig: { path: string }) => {
      versionedRoute.addVersion = jest.fn().mockImplementation((_config, routeHandler) => {
        if (routeConfig.path === executePath) {
          handler = routeHandler;
        }
        return versionedRoute;
      });
      return versionedRoute;
    };
    const router = {
      versioned: {
        get: jest.fn().mockImplementation(capture),
        post: jest.fn().mockImplementation(capture),
        put: jest.fn().mockImplementation(capture),
        delete: jest.fn().mockImplementation(capture),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerToolsRoutes({
      router,
      getInternalServices: jest.fn().mockReturnValue({
        tools: { getRegistry: jest.fn().mockResolvedValue(registry) },
      }),
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  const call = (toolParams: Record<string, unknown>) =>
    handler(
      {
        core: Promise.resolve({}),
        licensing: Promise.resolve({ license: { status: 'active', hasAtLeast: () => true } }),
      },
      { body: { tool_id: 'my.tool', tool_params: toolParams } },
      response
    );

  it('treats a null optional param as omitted and executes with the normalized params', async () => {
    await call({ query: 'x', types: null });

    expect(response.badRequest).not.toHaveBeenCalled();
    expect(registry.execute).toHaveBeenCalledWith(
      expect.objectContaining({ toolId: 'my.tool', toolParams: { query: 'x' } })
    );
  });

  it('still rejects a null required param', async () => {
    await call({ query: null });

    expect(response.badRequest).toHaveBeenCalledTimes(1);
    expect(registry.execute).not.toHaveBeenCalled();
  });
});
