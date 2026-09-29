/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { registerInternalAgentRoutes } from './agents';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';
import type {
  GetAgentAiIndicesResponse,
  ListAgentAiIndicesResponse,
} from '../../../common/http_api/agents';

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

describe('registerInternalAgentRoutes - agent AI indices', () => {
  const handlers = new Map<string, Handler>();
  let mockList: Mock;
  let mockGet: Mock;
  let mockResolveBase: Mock;

  const createMockContext = (contextEngineEnabled: boolean) => ({
    core: Promise.resolve({
      uiSettings: {
        client: {
          get: vi.fn(async (key: string) =>
            key === CONTEXT_ENGINE_ENABLED_SETTING_ID ? contextEngineEnabled : false
          ),
        },
      },
    }),
    // `wrapHandler` gates every route on the license before the handler body runs.
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: vi.fn().mockReturnValue(true) },
    }),
  });

  const mockResponse = {
    ok: vi.fn((params: { body?: unknown }) => ({ type: 'ok', ...params })),
    notFound: vi.fn(() => ({ type: 'notFound' })),
  };

  const callList = (contextEngineEnabled: boolean) =>
    handlers.get(`${internalApiPath}/agents/_ai_indices`)!(
      createMockContext(contextEngineEnabled),
      {},
      mockResponse
    ) as Promise<{
      type: string;
      body: ListAgentAiIndicesResponse;
    }>;

  const callById = (contextEngineEnabled: boolean, id = 'chat-agent') =>
    handlers.get(`${internalApiPath}/agents/{id}/_ai_indices`)!(
      createMockContext(contextEngineEnabled),
      { params: { id } },
      mockResponse
    ) as Promise<{
      type: string;
      body: GetAgentAiIndicesResponse;
    }>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();

    mockList = vi.fn().mockResolvedValue([
      { id: 'chat-agent', type: 'chat', configuration: { tools: [], ai_indices: ['my-index'] } },
      { id: 'discovery-agent', type: 'platform.sig_events.discovery-type', configuration: {} },
    ]);
    mockGet = vi.fn().mockResolvedValue({
      id: 'chat-agent',
      type: 'chat',
      configuration: { tools: [], ai_indices: ['my-index'] },
    });
    mockResolveBase = vi.fn(async ({ agentType }) =>
      agentType === 'chat' ? { ai_indices: ['elastic'] } : { ai_indices: ['another-one'] }
    );

    const getInternalServices = vi.fn().mockReturnValue({
      agents: {
        getRegistry: vi.fn().mockResolvedValue({ list: mockList, get: mockGet }),
        resolveAgentBaseConfiguration: mockResolveBase,
      },
    });

    const mockRouter = {
      get: vi.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        handlers.set(config.path, routeHandler);
      }),
      versioned: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
    } as unknown as Mocked<IRouter>;

    registerInternalAgentRoutes({
      router: mockRouter,
      getInternalServices,
      logger: loggingSystemMock.createLogger(),
    } as unknown as RouteDependencies);
  });

  describe('GET /agents/_ai_indices', () => {
    it('registers the list route under the internal api path', () => {
      expect(handlers.has(`${internalApiPath}/agents/_ai_indices`)).toBe(true);
    });

    it('reports effective AI indices with type-contributed ones flagged', async () => {
      const result = await callList(true);

      expect(result.body.results).toEqual([
        {
          agent_id: 'chat-agent',
          ai_indices: [
            { id: 'elastic', is_default: true },
            { id: 'my-index', is_default: false },
          ],
        },
        {
          agent_id: 'discovery-agent',
          ai_indices: [{ id: 'another-one', is_default: true }],
        },
      ]);
    });

    it('lists agents with no options, matching the public list endpoint visibility', async () => {
      await callList(true);

      expect(mockList).toHaveBeenCalledWith();
    });

    it('returns not found and does not resolve anything when the Context Engine is disabled', async () => {
      const result = await callList(false);

      expect(result.type).toBe('notFound');
      expect(mockResolveBase).not.toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
    });

    it('reports a resolve error in inherited AI indices instead of failing the whole request', async () => {
      mockResolveBase.mockImplementation(async ({ agentType }) => {
        if (agentType === 'chat') {
          throw new Error('boom');
        }
        return { ai_indices: ['another-one'] };
      });

      const result = await callList(true);

      expect(result.body.results).toEqual([
        {
          agent_id: 'chat-agent',
          ai_indices: [{ id: 'my-index', is_default: false }],
        },
        {
          agent_id: 'discovery-agent',
          ai_indices: [{ id: 'another-one', is_default: true }],
        },
      ]);
      expect(result.body.warnings).toEqual([
        {
          message: 'boom',
          agent_type: 'chat',
        },
      ]);
    });
  });

  describe('GET /agents/{id}/_ai_indices', () => {
    it('registers the by-id route under the internal api path', () => {
      expect(handlers.has(`${internalApiPath}/agents/{id}/_ai_indices`)).toBe(true);
    });

    it('reports effective AI indices for the requested agent', async () => {
      const result = await callById(true);

      expect(mockGet).toHaveBeenCalledWith('chat-agent');
      expect(result.body.ai_indices).toEqual([
        { id: 'elastic', is_default: true },
        { id: 'my-index', is_default: false },
      ]);
    });

    it('returns not found and does not load the agent when the Context Engine is disabled', async () => {
      const result = await callById(false);

      expect(result.type).toBe('notFound');
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockResolveBase).not.toHaveBeenCalled();
    });

    it('reports a resolve error separately instead of failing the whole request', async () => {
      mockResolveBase.mockRejectedValue(new Error('boom'));

      const result = await callById(true);

      expect(result.body.ai_indices).toEqual([{ id: 'my-index', is_default: false }]);
      expect(result.body.warnings).toEqual([
        {
          message: 'boom',
          agent_type: 'chat',
        },
      ]);
    });
  });
});
