/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerInternalAgentRoutes } from './agents';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

describe('registerInternalAgentRoutes - base configuration', () => {
  let registeredPath: string | undefined;
  let handler: Handler;
  let mockList: jest.Mock;
  let mockResolveBase: jest.Mock;

  const createMockContext = (contextEngineEnabled: boolean) => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: jest.fn(async (key: string) =>
            key === CONTEXT_ENGINE_ENABLED_SETTING_ID ? contextEngineEnabled : false
          ),
        },
      },
    }),
    // `wrapHandler` gates every route on the license before the handler body runs.
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  });

  const mockResponse = {
    ok: jest.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
  };

  const call = (contextEngineEnabled: boolean) =>
    handler(createMockContext(contextEngineEnabled), {}, mockResponse) as Promise<{
      type: string;
      body: { results: Array<{ agent_id: string; configuration: { ai_indices: string[] } }> };
    }>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockList = jest.fn().mockResolvedValue([
      { id: 'chat-agent', type: 'chat', configuration: { tools: [] } },
      { id: 'discovery-agent', type: 'platform.sig_events.discovery-type', configuration: {} },
    ]);
    mockResolveBase = jest.fn(async ({ agent }) =>
      agent.type === 'chat' ? { ai_indices: ['elastic'] } : { ai_indices: ['another-one'] }
    );

    const getInternalServices = jest.fn().mockReturnValue({
      agents: {
        getRegistry: jest.fn().mockResolvedValue({ list: mockList }),
        resolveAgentBaseConfiguration: mockResolveBase,
      },
    });

    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        registeredPath = config.path;
        handler = routeHandler;
      }),
      versioned: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    } as unknown as jest.Mocked<IRouter>;

    registerInternalAgentRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  it('registers the route under the internal api path', () => {
    expect(handler).toBeDefined();
    expect(registeredPath).toBe(`${internalApiPath}/agents/_base_configuration`);
  });

  it('reports the base AI indices contributed by each agent type', async () => {
    const result = await call(true);

    expect(result.body.results).toEqual([
      { agent_id: 'chat-agent', configuration: { ai_indices: ['elastic'] } },
      { agent_id: 'discovery-agent', configuration: { ai_indices: ['another-one'] } },
    ]);
  });

  it('lists agents with no options, matching the public list endpoint visibility', async () => {
    await call(true);

    expect(mockList).toHaveBeenCalledWith();
  });

  it('defaults to an empty list when a type contributes no ai_indices', async () => {
    mockResolveBase.mockResolvedValue({});

    const result = await call(true);

    expect(result.body.results.map(({ configuration }) => configuration.ai_indices)).toEqual([
      [],
      [],
    ]);
  });

  // An unregistered type resolves to `undefined`. The execution path would substitute the `chat`
  // type's base here, but reporting another type's AI indices as this agent's would be a guess.
  it('reports nothing when the agent type is not registered', async () => {
    mockResolveBase.mockResolvedValue(undefined);

    const result = await call(true);

    expect(result.body.results.map(({ configuration }) => configuration.ai_indices)).toEqual([
      [],
      [],
    ]);
  });

  it('returns no results and does not resolve anything when the Context Engine is disabled', async () => {
    const result = await call(false);

    expect(result.body.results).toEqual([]);
    expect(mockResolveBase).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });
});
