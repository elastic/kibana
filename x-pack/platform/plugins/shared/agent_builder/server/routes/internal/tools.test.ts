/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, CoreSetup } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { CONNECTOR_ID as MCP_CONNECTOR_ID } from '@kbn/connector-schemas/mcp/constants';
import { registerInternalToolsRoutes } from './tools';
import type { RouteDependencies } from '../types';
import { internalApiPath } from '../../../common/constants';

type Handler = (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

describe('registerInternalToolsRoutes - _list_connectors', () => {
  const ROUTE_PATH = `${internalApiPath}/tools/_list_connectors`;

  let handler: Handler;
  let mockGetAll: jest.Mock;
  let mockListTypes: jest.Mock;

  const mockCtx = {
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: jest.fn().mockReturnValue(true) },
    }),
  };

  const mockResponse = {
    ok: jest.fn((params?: { body?: unknown }) => ({ type: 'ok', ...(params ?? {}) })),
  };

  const makeRequest = (query: { type?: string } = {}) => ({ query });

  const connectorFixtures = [
    { id: 'conn-github', name: 'GitHub', actionTypeId: '.github', isPreconfigured: false },
    {
      id: 'conn-mcp',
      name: 'My MCP server',
      actionTypeId: MCP_CONNECTOR_ID,
      isPreconfigured: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetAll = jest.fn().mockResolvedValue(connectorFixtures);
    // Mirrors production: the MCP connector type doesn't carry the AgentBuilderConnectorFeatureId,
    // since it can't actually be used as a generic agent tool.
    mockListTypes = jest.fn().mockResolvedValue([{ id: '.github' }]);

    const mockRouter = {
      get: jest.fn().mockImplementation((config: { path: string }, routeHandler: Handler) => {
        if (config.path === ROUTE_PATH) handler = routeHandler;
      }),
      post: jest.fn(),
      delete: jest.fn(),
      versioned: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    } as unknown as IRouter;

    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        { security: { authc: { getCurrentUser: jest.fn() } } },
        {
          actions: {
            getActionsClientWithRequest: jest.fn().mockResolvedValue({
              getAll: mockGetAll,
              listTypes: mockListTypes,
            }),
          },
        },
      ]),
    } as unknown as CoreSetup;

    registerInternalToolsRoutes({
      router: mockRouter,
      coreSetup,
      getInternalServices: jest.fn(),
      logger: loggingSystemMock.createLogger(),
      pluginsSetup: {},
    } as unknown as RouteDependencies);
  });

  it('excludes the MCP connector from the unfiltered connector list', async () => {
    const result = (await handler(mockCtx, makeRequest(), mockResponse)) as {
      body: { connectors: Array<{ actionTypeId: string }> };
    };

    expect(result.body.connectors.map((c) => c.actionTypeId)).toEqual(['.github']);
  });

  it('still returns the MCP connector when explicitly requested by type', async () => {
    const result = (await handler(
      mockCtx,
      makeRequest({ type: MCP_CONNECTOR_ID }),
      mockResponse
    )) as {
      body: { connectors: Array<{ actionTypeId: string }> };
    };

    expect(result.body.connectors.map((c) => c.actionTypeId)).toEqual([MCP_CONNECTOR_ID]);
  });

  it('does not regress filtering by a non-MCP type', async () => {
    const result = (await handler(mockCtx, makeRequest({ type: '.github' }), mockResponse)) as {
      body: { connectors: Array<{ actionTypeId: string }> };
    };

    expect(result.body.connectors.map((c) => c.actionTypeId)).toEqual(['.github']);
  });
});
