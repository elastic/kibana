/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { registerDashboardsMcpTools } from './dashboards';

describe('registerDashboardsMcpTools', () => {
  let mockServer: jest.Mocked<McpServer>;
  let mockRequest: KibanaRequest;
  let mockCtx: RequestHandlerContext;
  let mockContentManagement: ContentManagementServerSetup;
  let mockSoClient: {
    resolve: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let mockLensClient: {
    get: jest.Mock;
    search: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let registeredTools: Map<string, { description: string; schema: unknown; handler: Function }>;

  beforeEach(() => {
    registeredTools = new Map();

    mockServer = {
      tool: jest.fn().mockImplementation((name, description, schema, handler) => {
        registeredTools.set(name, { description, schema, handler });
      }),
    } as unknown as jest.Mocked<McpServer>;

    mockRequest = {
      headers: {
        authorization: 'Basic dGVzdDp0ZXN0',
      },
    } as unknown as KibanaRequest;

    mockSoClient = {
      resolve: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
    };

    mockCtx = {
      resolve: jest.fn().mockResolvedValue({
        core: {
          savedObjects: {
            client: mockSoClient,
          },
        },
      }),
      core: Promise.resolve({
        savedObjects: {
          client: mockSoClient,
        },
      }),
    } as unknown as RequestHandlerContext;

    mockLensClient = {
      get: jest.fn(),
      search: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockContentManagement = {
      contentClient: {
        getForRequest: jest.fn().mockReturnValue({
          for: jest.fn().mockReturnValue(mockLensClient),
        }),
      },
    } as unknown as ContentManagementServerSetup;
  });

  it('registers all dashboard and visualization tools when contentManagement is available', () => {
    registerDashboardsMcpTools(mockServer, mockRequest, mockCtx, mockContentManagement);

    expect(mockServer.tool).toHaveBeenCalledTimes(11);

    const toolNames = Array.from(registeredTools.keys());
    expect(toolNames).toEqual([
      'platform_dashboard_get',
      'platform_dashboard_create',
      'platform_dashboard_update',
      'platform_dashboard_delete',
      'platform_dashboard_list',
      'platform_dashboard_search',
      'platform_visualizations_list',
      'platform_visualizations_get',
      'platform_visualizations_create',
      'platform_visualizations_update',
      'platform_visualizations_delete',
    ]);
  });

  it('registers only dashboard tools when contentManagement is not available', () => {
    registerDashboardsMcpTools(mockServer, mockRequest, mockCtx);

    expect(mockServer.tool).toHaveBeenCalledTimes(6);

    const toolNames = Array.from(registeredTools.keys());
    expect(toolNames).toEqual([
      'platform_dashboard_get',
      'platform_dashboard_create',
      'platform_dashboard_update',
      'platform_dashboard_delete',
      'platform_dashboard_list',
      'platform_dashboard_search',
    ]);
  });

  describe('namespace filtering', () => {
    it('registers only dashboard tools when namespace is platform.dashboard', () => {
      registerDashboardsMcpTools(
        mockServer,
        mockRequest,
        mockCtx,
        mockContentManagement,
        'platform.dashboard'
      );

      const toolNames = Array.from(registeredTools.keys());
      expect(toolNames).toEqual([
        'platform_dashboard_get',
        'platform_dashboard_create',
        'platform_dashboard_update',
        'platform_dashboard_delete',
        'platform_dashboard_list',
        'platform_dashboard_search',
      ]);
    });

    it('registers only visualization tools when namespace is platform.visualizations', () => {
      registerDashboardsMcpTools(
        mockServer,
        mockRequest,
        mockCtx,
        mockContentManagement,
        'platform.visualizations'
      );

      const toolNames = Array.from(registeredTools.keys());
      expect(toolNames).toEqual([
        'platform_visualizations_list',
        'platform_visualizations_get',
        'platform_visualizations_create',
        'platform_visualizations_update',
        'platform_visualizations_delete',
      ]);
    });

    it('registers tools from multiple namespaces when comma-separated', () => {
      registerDashboardsMcpTools(
        mockServer,
        mockRequest,
        mockCtx,
        mockContentManagement,
        'platform.dashboard, platform.visualizations'
      );

      expect(mockServer.tool).toHaveBeenCalledTimes(11);
    });

    it('registers no tools when namespace does not match', () => {
      registerDashboardsMcpTools(
        mockServer,
        mockRequest,
        mockCtx,
        mockContentManagement,
        'platform.core'
      );

      expect(mockServer.tool).not.toHaveBeenCalled();
    });
  });

  describe('dashboard tool handlers', () => {
    beforeEach(() => {
      registerDashboardsMcpTools(mockServer, mockRequest, mockCtx, mockContentManagement);
    });

    it('platform_dashboard_get resolves a dashboard by ID', async () => {
      mockSoClient.resolve.mockResolvedValue({
        saved_object: {
          id: 'test-id',
          attributes: { title: 'Test Dashboard', description: 'A test dashboard' },
          references: [{ name: 'tag-0', type: 'tag', id: 'tag-1' }],
        },
      });

      const handler = registeredTools.get('platform_dashboard_get')!.handler;
      const result = await handler({ id: 'test-id' });

      expect(mockSoClient.resolve).toHaveBeenCalledWith('dashboard', 'test-id');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe('test-id');
      expect(parsed.data.title).toBe('Test Dashboard');
      expect(parsed.data.description).toBe('A test dashboard');
      expect(parsed.data.tags).toEqual(['tag-1']);
    });

    it('platform_dashboard_get handles errors', async () => {
      mockSoClient.resolve.mockRejectedValue(new Error('Not found'));

      const handler = registeredTools.get('platform_dashboard_get')!.handler;
      const result = await handler({ id: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not found');
    });

    it('platform_dashboard_create creates a dashboard', async () => {
      mockSoClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { title: 'New Dashboard' },
        references: [],
      });

      const handler = registeredTools.get('platform_dashboard_create')!.handler;
      const result = await handler({
        definition: JSON.stringify({ title: 'New Dashboard', panels: [] }),
      });

      expect(mockSoClient.create).toHaveBeenCalledWith(
        'dashboard',
        expect.objectContaining({ title: 'New Dashboard' }),
        expect.objectContaining({ references: [] })
      );
      expect(result.isError).toBeUndefined();
    });

    it('platform_dashboard_create returns error for invalid JSON', async () => {
      const handler = registeredTools.get('platform_dashboard_create')!.handler;
      const result = await handler({ definition: 'not-valid-json' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Invalid JSON in definition' }],
        isError: true,
      });
    });

    it('platform_dashboard_create strips id and spaces from request body', async () => {
      mockSoClient.create.mockResolvedValue({
        id: 'new-id',
        attributes: { title: 'New Dashboard' },
        references: [],
      });

      const handler = registeredTools.get('platform_dashboard_create')!.handler;
      await handler({
        definition: JSON.stringify({
          id: 'should-be-stripped',
          spaces: ['default'],
          title: 'New Dashboard',
          panels: [],
        }),
      });

      const attrs = mockSoClient.create.mock.calls[0][1];
      expect(attrs).not.toHaveProperty('id');
      expect(attrs).not.toHaveProperty('spaces');
      expect(attrs.title).toBe('New Dashboard');
    });

    it('platform_dashboard_update returns error for invalid JSON', async () => {
      const handler = registeredTools.get('platform_dashboard_update')!.handler;
      const result = await handler({ id: 'test-id', definition: '{bad json' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Invalid JSON in definition' }],
        isError: true,
      });
    });

    it('platform_dashboard_delete deletes and returns success', async () => {
      mockSoClient.delete.mockResolvedValue({});

      const handler = registeredTools.get('platform_dashboard_delete')!.handler;
      const result = await handler({ id: 'delete-me' });

      expect(mockSoClient.delete).toHaveBeenCalledWith('dashboard', 'delete-me');
      expect(result.content[0].text).toContain('deleted successfully');
    });

    it('platform_dashboard_list lists all dashboards', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'dash-1',
            attributes: { title: 'Dashboard 1' },
            references: [],
          },
          {
            id: 'dash-2',
            attributes: { title: 'Dashboard 2' },
            references: [],
          },
        ],
        total: 2,
        page: 1,
      });

      const handler = registeredTools.get('platform_dashboard_list')!.handler;
      const result = await handler({ page: 1, per_page: 50 });

      expect(mockSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dashboard',
          page: 1,
          perPage: 50,
        })
      );
      // list should NOT pass a search query
      expect(mockSoClient.find.mock.calls[0][0]).not.toHaveProperty('search');
      expect(mockSoClient.find.mock.calls[0][0]).not.toHaveProperty('searchFields');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.dashboards).toHaveLength(2);
      expect(parsed.total).toBe(2);
    });

    it('platform_dashboard_search searches dashboards', async () => {
      mockSoClient.find.mockResolvedValue({
        saved_objects: [
          {
            id: 'dash-1',
            attributes: { title: 'Dashboard 1' },
            references: [],
          },
        ],
        total: 1,
        page: 1,
      });

      const handler = registeredTools.get('platform_dashboard_search')!.handler;
      const result = await handler({ query: 'test', page: 1, per_page: 25 });

      expect(mockSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'dashboard',
          search: 'test',
          page: 1,
          perPage: 25,
        })
      );
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.dashboards).toHaveLength(1);
      expect(parsed.total).toBe(1);
    });
  });

  describe('visualization tool handlers', () => {
    beforeEach(() => {
      registerDashboardsMcpTools(mockServer, mockRequest, mockCtx, mockContentManagement);
    });

    it('platform_visualizations_create returns error for invalid JSON', async () => {
      const handler = registeredTools.get('platform_visualizations_create')!.handler;
      const result = await handler({ definition: 'not json' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Invalid JSON in definition' }],
        isError: true,
      });
    });

    it('platform_visualizations_update returns error for invalid JSON', async () => {
      const handler = registeredTools.get('platform_visualizations_update')!.handler;
      const result = await handler({ id: 'test-id', definition: '{{' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Invalid JSON in definition' }],
        isError: true,
      });
    });

    it('platform_visualizations_delete calls content client delete', async () => {
      mockLensClient.delete.mockResolvedValue({ result: { success: true } });

      const handler = registeredTools.get('platform_visualizations_delete')!.handler;
      const result = await handler({ id: 'vis-1' });

      expect(mockLensClient.delete).toHaveBeenCalledWith('vis-1');
      expect(result.content[0].text).toContain('deleted successfully');
    });
  });
});
