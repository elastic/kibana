/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CoreSetup } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { listAgentConnectors, getAgentConnectorDetail } from '@kbn/agent-builder-server';
import { registerInternalConnectorRoutes } from './connectors';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

jest.mock('@kbn/agent-builder-server', () => ({
  listAgentConnectors: jest.fn(),
  getAgentConnectorDetail: jest.fn(),
}));

const mockListAgentConnectors = listAgentConnectors as jest.Mock;
const mockGetAgentConnectorDetail = getAgentConnectorDetail as jest.Mock;

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

describe('registerInternalConnectorRoutes', () => {
  const ROUTE_PATH = `${internalApiPath}/connectors`;

  let handler: Handler;
  let mockRegistryGet: jest.Mock;
  let mockResolveAgentConfiguration: jest.Mock;
  let mockGetActionsClientWithRequest: jest.Mock;

  const mockCtx = {
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  };

  const mockResponse = {
    ok: jest.fn((params?: { body?: unknown }) => ({ type: 'ok', ...(params ?? {}) })),
    notFound: jest.fn((params?: { body?: unknown }) => ({ type: 'notFound', ...(params ?? {}) })),
    forbidden: jest.fn(() => ({ type: 'forbidden' })),
    customError: jest.fn((params?: unknown) => ({ type: 'customError', ...(params ?? {}) })),
  };

  const makeRequest = ({
    agentId,
    connectorId,
  }: { agentId?: string; connectorId?: string } = {}) => ({
    headers: agentId ? { 'x-agent-builder-agent-id': agentId } : {},
    query: connectorId !== undefined ? { id: connectorId } : {},
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const mockAgent = { id: 'agent-1', type: 'chat', configuration: {} };
    mockRegistryGet = jest.fn().mockResolvedValue(mockAgent);
    mockResolveAgentConfiguration = jest.fn().mockResolvedValue({ connector_ids: ['conn-1'] });
    mockGetActionsClientWithRequest = jest.fn().mockResolvedValue({});

    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        if (config.path === ROUTE_PATH) handler = routeHandler;
      }),
      versioned: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    } as unknown as IRouter;

    const coreSetup = {
      getStartServices: jest
        .fn()
        .mockResolvedValue([
          {},
          { actions: { getActionsClientWithRequest: mockGetActionsClientWithRequest } },
        ]),
    } as unknown as CoreSetup;

    const getInternalServices = jest.fn().mockReturnValue({
      agents: {
        getRegistry: jest.fn().mockResolvedValue({ get: mockRegistryGet }),
        resolveAgentConfiguration: mockResolveAgentConfiguration,
      },
    });

    mockListAgentConnectors.mockResolvedValue([
      { id: 'conn-1', name: 'GitHub', type: '.github', description: 'Manage issues' },
    ]);
    mockGetAgentConnectorDetail.mockResolvedValue({
      id: 'conn-1',
      name: 'GitHub',
      type: '.github',
      description: 'Manage issues',
      subActions: [],
    });

    registerInternalConnectorRoutes({
      router: mockRouter,
      coreSetup,
      logger: loggingSystemMock.createLogger(),
      getInternalServices,
    } as unknown as RouteDependencies);
  });

  describe('agent header scoping (resolveAllowedConnectorIds)', () => {
    it('passes allowedIds: undefined when no agent header is present', async () => {
      await handler(mockCtx, makeRequest(), mockResponse);

      expect(mockRegistryGet).not.toHaveBeenCalled();
      expect(mockListAgentConnectors).toHaveBeenCalledWith(expect.anything(), {
        allowedIds: undefined,
      });
    });

    it('uses the effective configuration connector_ids when the agent is found', async () => {
      mockResolveAgentConfiguration.mockResolvedValue({ connector_ids: ['id1', 'id2'] });

      await handler(mockCtx, makeRequest({ agentId: 'agent-1' }), mockResponse);

      expect(mockResolveAgentConfiguration).toHaveBeenCalled();
      expect(mockListAgentConnectors).toHaveBeenCalledWith(expect.anything(), {
        allowedIds: ['id1', 'id2'],
      });
    });

    it('passes allowedIds: undefined when the agent has no connector restriction', async () => {
      mockResolveAgentConfiguration.mockResolvedValue({ connector_ids: undefined });

      await handler(mockCtx, makeRequest({ agentId: 'agent-1' }), mockResponse);

      expect(mockListAgentConnectors).toHaveBeenCalledWith(expect.anything(), {
        allowedIds: undefined,
      });
    });

    it('passes allowedIds: [] (fail closed) when the agent is not found', async () => {
      mockRegistryGet.mockRejectedValue({ output: { statusCode: 404 } });

      await handler(mockCtx, makeRequest({ agentId: 'unknown-agent' }), mockResponse);

      expect(mockListAgentConnectors).toHaveBeenCalledWith(expect.anything(), { allowedIds: [] });
    });

    it('propagates transient registry errors rather than falling back to unscoped access', async () => {
      mockRegistryGet.mockRejectedValue(
        Object.assign(new Error('DB error'), { output: { statusCode: 500 } })
      );

      const result = (await handler(
        mockCtx,
        makeRequest({ agentId: 'agent-1' }),
        mockResponse
      )) as { type: string };

      expect(result.type).toBe('customError');
      expect(mockListAgentConnectors).not.toHaveBeenCalled();
    });
  });

  describe('list path (no ?id)', () => {
    it('returns the connector list', async () => {
      const result = (await handler(
        mockCtx,
        makeRequest({ agentId: 'agent-1' }),
        mockResponse
      )) as { type: string; body: unknown };

      expect(result.type).toBe('ok');
      expect(result.body).toEqual([
        { id: 'conn-1', name: 'GitHub', type: '.github', description: 'Manage issues' },
      ]);
    });
  });

  describe('detail path (?id=connectorId)', () => {
    it('returns connector detail when the connector exists and has a spec', async () => {
      const result = (await handler(
        mockCtx,
        makeRequest({ agentId: 'agent-1', connectorId: 'conn-1' }),
        mockResponse
      )) as { type: string; body: unknown };

      expect(result.type).toBe('ok');
      expect(mockGetAgentConnectorDetail).toHaveBeenCalledWith(expect.anything(), 'conn-1', {
        allowedIds: ['conn-1'],
      });
    });

    it('returns notFound when the connector has no spec or is not in allowedIds', async () => {
      mockGetAgentConnectorDetail.mockResolvedValue(null);

      const result = (await handler(
        mockCtx,
        makeRequest({ agentId: 'agent-1', connectorId: 'conn-1' }),
        mockResponse
      )) as { type: string };

      expect(result.type).toBe('notFound');
    });

    it('returns notFound when the connector does not exist in the actions registry', async () => {
      mockGetAgentConnectorDetail.mockRejectedValue({ output: { statusCode: 404 } });

      const result = (await handler(
        mockCtx,
        makeRequest({ agentId: 'agent-1', connectorId: 'missing' }),
        mockResponse
      )) as { type: string };

      expect(result.type).toBe('notFound');
    });
  });
});
