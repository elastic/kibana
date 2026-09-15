/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { registerMCPRoutes, filterToolsByNamespace } from './mcp';
import type { RouteDependencies } from './types';
import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod/v4';
import { MCP_SERVER_PATH } from '@kbn/agent-builder-common';

const createMockTool = (
  id: string,
  overrides: Partial<InternalToolDefinition> = {}
): InternalToolDefinition => ({
  id,
  type: ToolType.builtin,
  description: `Tool ${id}`,
  tags: [],
  configuration: {},
  readonly: false,
  experimental: false,
  isAvailable: jest.fn().mockResolvedValue({ status: 'available' }),
  getSchema: jest.fn().mockResolvedValue(z.object({})),
  getHandler: jest.fn().mockResolvedValue(jest.fn()),
  ...overrides,
});

describe('filterToolsByNamespace', () => {
  it('returns all tools when no namespace parameter is provided', () => {
    const tools = [
      createMockTool('my.custom.tool1'),
      createMockTool('my.custom.tool2'),
      createMockTool('core.tool1'),
      createMockTool('tool-without-namespace'),
    ];
    const filtered = filterToolsByNamespace(tools);
    expect(filtered).toHaveLength(4);
    expect(filtered).toEqual(tools);
  });

  it('returns all tools when namespace parameter is undefined', () => {
    const tools = [createMockTool('my.custom.tool1'), createMockTool('core.tool1')];
    const filtered = filterToolsByNamespace(tools, undefined);
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(tools);
  });

  it('filters tools by single namespace', () => {
    const allTools = [
      createMockTool('my.custom.tool1'),
      createMockTool('my.custom.tool2'),
      createMockTool('core.tool1'),
      createMockTool('core.tool2'),
      createMockTool('other.namespace.tool1'),
    ];
    const filtered = filterToolsByNamespace(allTools, 'my.custom');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.id)).toEqual(['my.custom.tool1', 'my.custom.tool2']);
  });

  it('filters tools by multiple comma-separated namespaces', () => {
    const allTools = [
      createMockTool('my.custom.tool1'),
      createMockTool('my.custom.tool2'),
      createMockTool('core.tool1'),
      createMockTool('core.tool2'),
      createMockTool('other.namespace.tool1'),
    ];
    const filtered = filterToolsByNamespace(allTools, 'my.custom,core');
    expect(filtered).toHaveLength(4);
    expect(filtered.map((t) => t.id)).toEqual([
      'my.custom.tool1',
      'my.custom.tool2',
      'core.tool1',
      'core.tool2',
    ]);
  });

  it('handles empty namespace parameter gracefully', () => {
    const allTools = [createMockTool('my.custom.tool1'), createMockTool('core.tool1')];
    const filtered = filterToolsByNamespace(allTools, '');
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(allTools);
  });

  it('handles whitespace-only namespace parameter gracefully', () => {
    const allTools = [createMockTool('my.custom.tool1'), createMockTool('core.tool1')];
    const filtered = filterToolsByNamespace(allTools, '   ');
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(allTools);
  });

  it('handles comma-separated namespaces with whitespace', () => {
    const allTools = [
      createMockTool('my.custom.tool1'),
      createMockTool('core.tool1'),
      createMockTool('other.namespace.tool1'),
    ];
    const filtered = filterToolsByNamespace(allTools, ' my.custom , core ');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((t) => t.id)).toEqual(['my.custom.tool1', 'core.tool1']);
  });

  it('excludes tools without namespaces when filtering', () => {
    const allTools = [
      createMockTool('my.custom.tool1'),
      createMockTool('tool-without-namespace'),
      createMockTool('core.tool1'),
    ];
    const filtered = filterToolsByNamespace(allTools, 'my.custom');
    expect(filtered).toHaveLength(1);
    expect(filtered.map((t) => t.id)).toEqual(['my.custom.tool1']);
  });

  it('does not match tools where namespace is a substring but not an exact match', () => {
    const allTools = [createMockTool('my.custom.tool1'), createMockTool('custom.tool1')];
    const filtered = filterToolsByNamespace(allTools, 'custom');
    expect(filtered).toHaveLength(1);
    expect(filtered.map((t) => t.id)).toEqual(['custom.tool1']);
  });

  it('returns empty array when no tools match the namespace', () => {
    const allTools = [createMockTool('my.custom.tool1'), createMockTool('core.tool1')];
    const filtered = filterToolsByNamespace(allTools, 'nonexistent.namespace');
    expect(filtered).toHaveLength(0);
  });

  it('handles invalid namespace format gracefully', () => {
    const allTools = [createMockTool('my.custom.tool1'), createMockTool('core.tool1')];
    const filtered = filterToolsByNamespace(allTools, ',,,');
    expect(filtered).toHaveLength(2);
    expect(filtered).toEqual(allTools);
  });
});

const mockRegisterTool = jest.fn();
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    registerTool: mockRegisterTool,
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('../utils/mcp/kibana_mcp_http_transport', () => ({
  KibanaMcpHttpTransport: jest.fn().mockImplementation(() => ({
    handleRequest: jest.fn().mockResolvedValue({ status: 200 }),
    close: jest.fn(),
  })),
}));

describe('MCP route — registerTool arguments', () => {
  const mockAnnotations = {
    title: 'List Indices',
    readOnlyHint: true as const,
    destructiveHint: false as const,
    idempotentHint: true as const,
    openWorldHint: false as const,
  };

  let postHandler: Function;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockLogger = loggingSystemMock.createLogger();

    const annotatedTool = createMockTool('platform.core.list_indices', {
      annotations: mockAnnotations,
    });
    const unannotatedTool = createMockTool('platform.core.search');
    const excludedTool = createMockTool('platform.core.execute_connector_sub_action', {
      annotations: mockAnnotations,
      excludeFromMcp: true,
    });

    const mockRegistry = {
      list: jest.fn().mockResolvedValue([annotatedTool, unannotatedTool, excludedTool]),
      execute: jest.fn().mockResolvedValue({ results: [{ type: 'other', data: {} }] }),
    };
    const getInternalServices = jest.fn().mockReturnValue({
      tools: { getRegistry: jest.fn().mockResolvedValue(mockRegistry) },
    });

    const captureVersioned = (method: string) =>
      jest.fn().mockImplementation((routeConfig: { path: string }) => {
        const versionedRoute = {
          addVersion: jest.fn().mockImplementation((_config: any, handler: Function) => {
            if (method === 'POST') {
              postHandler = handler;
            }
            return versionedRoute;
          }),
        };
        return versionedRoute;
      });

    const mockRouter = {
      get: jest.fn(),
      versioned: { post: captureVersioned('POST') },
    } as unknown as jest.Mocked<IRouter>;

    registerMCPRoutes({
      router: mockRouter,
      getInternalServices,
      logger: mockLogger,
    } as unknown as RouteDependencies);
  });

  const createMockRequest = () => ({
    query: {},
    events: { aborted$: { subscribe: jest.fn() } },
  });

  const createMockContext = () => ({
    core: Promise.resolve({ uiSettings: { client: { get: jest.fn() } } }),
    licensing: Promise.resolve({
      license: { status: 'active', hasAtLeast: () => true },
    }),
  });

  it('passes annotations in config when the tool has them', async () => {
    await postHandler(createMockContext(), createMockRequest(), { customError: jest.fn() });

    const annotatedCall = mockRegisterTool.mock.calls.find(
      (call: any[]) => call[0] === 'platform_core_list_indices'
    );
    expect(annotatedCall).toBeDefined();
    const [, config, callback] = annotatedCall!;
    expect(config.annotations).toEqual(mockAnnotations);
    expect(config.description).toBe('Tool platform.core.list_indices');
    expect(typeof callback).toBe('function');
  });

  it('passes undefined annotations when tool has none', async () => {
    await postHandler(createMockContext(), createMockRequest(), { customError: jest.fn() });

    const unannotatedCall = mockRegisterTool.mock.calls.find(
      (call: any[]) => call[0] === 'platform_core_search'
    );
    expect(unannotatedCall).toBeDefined();
    const [, config, callback] = unannotatedCall!;
    expect(config.annotations).toBeUndefined();
    expect(typeof callback).toBe('function');
  });

  it('excludes tools with excludeFromMcp: true', async () => {
    await postHandler(createMockContext(), createMockRequest(), { customError: jest.fn() });

    const excludedCall = mockRegisterTool.mock.calls.find(
      (call: any[]) => call[0] === 'platform_core_execute_connector_sub_action'
    );
    expect(excludedCall).toBeUndefined();
    expect(mockRegisterTool).toHaveBeenCalledTimes(2);
  });
});

describe('MCP route — real SDK tool registration', () => {
  it('registers an unannotated tool without throwing', () => {
    jest.restoreAllMocks();
    const { McpServer: RealMcpServer } = jest.requireActual<
      typeof import('@modelcontextprotocol/sdk/server/mcp.js')
    >('@modelcontextprotocol/sdk/server/mcp.js');

    const server = new RealMcpServer({ name: 'test', version: '0.0.1' });
    const handler = jest.fn().mockResolvedValue({
      content: [{ type: 'text' as const, text: 'ok' }],
    });

    expect(() => {
      server.registerTool(
        'unannotated_tool',
        { description: 'no annotations', inputSchema: {} },
        handler
      );
    }).not.toThrow();
  });

  it('registers an annotated tool without throwing', () => {
    jest.restoreAllMocks();
    const { McpServer: RealMcpServer } = jest.requireActual<
      typeof import('@modelcontextprotocol/sdk/server/mcp.js')
    >('@modelcontextprotocol/sdk/server/mcp.js');

    const server = new RealMcpServer({ name: 'test', version: '0.0.1' });
    const handler = jest.fn().mockResolvedValue({
      content: [{ type: 'text' as const, text: 'ok' }],
    });

    expect(() => {
      server.registerTool(
        'annotated_tool',
        {
          description: 'with annotations',
          inputSchema: {},
          annotations: {
            title: 'My Tool',
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        handler
      );
    }).not.toThrow();
  });

  it('rejects duplicate registration (proves first registration took effect)', () => {
    jest.restoreAllMocks();
    const { McpServer: RealMcpServer } = jest.requireActual<
      typeof import('@modelcontextprotocol/sdk/server/mcp.js')
    >('@modelcontextprotocol/sdk/server/mcp.js');

    const server = new RealMcpServer({ name: 'test', version: '0.0.1' });
    const handler = jest.fn();

    server.registerTool('my_tool', { description: 'first', inputSchema: {} }, handler);

    expect(() => {
      server.registerTool('my_tool', { description: 'duplicate', inputSchema: {} }, handler);
    }).toThrow(/already registered/);
  });
});

describe('registerMCPRoutes', () => {
  const routeKey = `POST:${MCP_SERVER_PATH}`;
  const getRouteKey = `GET:${MCP_SERVER_PATH}`;
  let routeHandlers: Record<string, { routeConfig: any; config: any; handler: Function }>;

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};

    const mockLogger = loggingSystemMock.createLogger();
    const mockRegistry = {
      list: jest.fn(),
      execute: jest.fn().mockResolvedValue({ results: [{ type: 'other', data: {} }] }),
    };
    const getInternalServices = jest.fn().mockReturnValue({
      tools: { getRegistry: jest.fn().mockResolvedValue(mockRegistry) },
    });

    const captureVersioned = (method: string) =>
      jest.fn().mockImplementation((routeConfig: { path: string }) => {
        const versionedRoute = { addVersion: jest.fn() };
        versionedRoute.addVersion = jest
          .fn()
          .mockImplementation((vConfig: any, handler: Function) => {
            routeHandlers[`${method}:${routeConfig.path}`] = {
              routeConfig,
              config: vConfig,
              handler,
            };
            return versionedRoute;
          });
        return versionedRoute;
      });

    const mockRouter = {
      // The GET fallback is a non-versioned route registered directly on the router.
      get: jest.fn().mockImplementation((routeConfig: { path: string }, handler: Function) => {
        routeHandlers[`GET:${routeConfig.path}`] = { routeConfig, config: undefined, handler };
      }),
      versioned: {
        post: captureVersioned('POST'),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerMCPRoutes({
      router: mockRouter,
      getInternalServices,
      logger: mockLogger,
    } as unknown as RouteDependencies);
  });

  it('registers route with namespace query parameter validation', () => {
    const routeConfig = routeHandlers[routeKey]?.config;
    expect(routeConfig).toBeDefined();
    expect(routeConfig?.validate?.request?.query).toBeDefined();

    const querySchema = routeConfig?.validate?.request?.query;
    expect(querySchema).toBeDefined();
  });

  describe('GET (unsupported method)', () => {
    it('registers a non-versioned GET handler on the MCP path to shadow the SPA catch-all', () => {
      expect(routeHandlers[getRouteKey]).toBeDefined();
    });

    it('is public, skips authn/authz, and is excluded from the OAS', () => {
      // public: an internal route would 400 for external clients (serverless internal-API
      // restriction); the MCP client only treats 405 as benign, so it must reach the handler.
      // No auth: an authenticated GET on an untagged route is rejected with a 401, which MCP
      // clients treat as an auth failure and retry the OAuth flow instead of issuing POST.
      // excludeFromOAS: it is a protocol-level stub, not a documented API.
      const { routeConfig } = routeHandlers[getRouteKey];
      expect(routeConfig.options.access).toBe('public');
      expect(routeConfig.security.authc.enabled).toBe(false);
      expect(routeConfig.security.authz.enabled).toBe(false);
      expect(routeConfig.options.excludeFromOAS).toBe(true);
    });

    it('responds 405 so MCP clients ignore the stream and use POST', async () => {
      const { handler } = routeHandlers[getRouteKey];
      const response = { customError: jest.fn() };
      await handler({}, {}, response);
      expect(response.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 405 })
      );
    });
  });
});
