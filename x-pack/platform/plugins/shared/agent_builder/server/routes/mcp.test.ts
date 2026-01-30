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
import { z } from '@kbn/zod';
import { MCP_SERVER_PATH } from '../../common/mcp';

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

describe('registerMCPRoutes', () => {
  const routeKey = `POST:${MCP_SERVER_PATH}`;
  let routeHandlers: Record<string, { config: any; handler: Function }>;

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

    const mockRouter = {
      versioned: {
        post: jest.fn().mockImplementation((config: { path: string }) => {
          const versionedRoute = { addVersion: jest.fn() };
          versionedRoute.addVersion = jest
            .fn()
            .mockImplementation((vConfig: any, handler: Function) => {
              routeHandlers[`POST:${config.path}`] = { config: vConfig, handler };
              return versionedRoute;
            });
          return versionedRoute;
        }),
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
});
