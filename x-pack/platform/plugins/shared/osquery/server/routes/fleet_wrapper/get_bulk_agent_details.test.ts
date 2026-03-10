/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { getBulkAgentDetailsRoute } from './get_bulk_agent_details';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

interface MockContext {
  core: Promise<{
    logger: {
      get: jest.Mock;
    };
  }>;
}

describe('getBulkAgentDetailsRoute', () => {
  let mockOsqueryContext: OsqueryAppContext;
  let mockRouter: ReturnType<
    ReturnType<typeof httpServiceMock.createSetupContract>['createRouter']
  >;
  let routeHandler: RequestHandler<unknown, unknown, { agentIds: string[] }>;
  let mockContext: MockContext;

  const mockAgentService = {
    asInternalScopedUser: jest.fn(),
  };

  const mockGetByIds = jest.fn();

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  const createMockContext = (): MockContext => ({
    core: Promise.resolve({
      logger: {
        get: jest.fn().mockReturnValue({
          debug: jest.fn(),
          info: jest.fn(),
          error: jest.fn(),
        }),
      },
    }),
  });

  const createMockRequest = (agentIds: string[]) =>
    httpServerMock.createKibanaRequest({
      body: { agentIds },
    });

  const createMockResponse = () => httpServerMock.createResponseFactory();

  beforeEach(() => {
    jest.clearAllMocks();

    mockAgentService.asInternalScopedUser.mockReturnValue({
      getByIds: mockGetByIds,
    });

    mockOsqueryContext = {
      logFactory: {
        get: jest.fn().mockReturnValue(mockLogger),
      },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default' }),
        getAgentService: jest.fn().mockReturnValue(mockAgentService),
      },
    } as unknown as OsqueryAppContext;

    mockContext = createMockContext();

    const httpService = httpServiceMock.createSetupContract();
    mockRouter = httpService.createRouter();

    getBulkAgentDetailsRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute(
      'post',
      '/internal/osquery/fleet_wrapper/agents/_bulk'
    );
    const routeVersion = route.versions['1'];
    if (!routeVersion) {
      throw new Error('Handler for version [1] not found!');
    }

    routeHandler = routeVersion.handler;
  });

  describe('Successful bulk agent fetch', () => {
    it.each([
      {
        agentIds: ['agent-1', 'agent-2'],
        description: 'multiple agents',
      },
      {
        agentIds: ['agent-1'],
        description: 'single agent',
      },
      {
        agentIds: Array.from({ length: 1000 }, (_, i) => `agent-${i}`),
        description: '1000 agents (maximum allowed)',
      },
    ])('should fetch $description and return their details', async ({ agentIds }) => {
      const mockAgents = agentIds.map((id) => ({
        id,
        local_metadata: { host: { name: `host-${id}` } },
      }));

      mockGetByIds.mockResolvedValue(mockAgents);

      const mockRequest = createMockRequest(agentIds);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockGetByIds).toHaveBeenCalledWith(agentIds, { ignoreMissing: true });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: mockAgents,
        },
      });
    });

    it('should handle missing/deleted agents with ignoreMissing=true', async () => {
      const mockAgents = [
        { id: 'agent-1', local_metadata: { host: { name: 'host-1' } } },
        { id: 'agent-2', local_metadata: { host: { name: 'host-2' } } },
        { id: 'agent-5', local_metadata: { host: { name: 'host-5' } } },
      ];

      mockGetByIds.mockResolvedValue(mockAgents);

      const mockRequest = createMockRequest([
        'agent-1',
        'agent-2',
        'agent-3',
        'agent-4',
        'agent-5',
      ]);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockGetByIds).toHaveBeenCalledWith(
        ['agent-1', 'agent-2', 'agent-3', 'agent-4', 'agent-5'],
        { ignoreMissing: true }
      );

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: mockAgents,
        },
      });
    });
  });

  describe('Space isolation', () => {
    it('should use correct space ID for agent service', async () => {
      const customSpaceId = 'custom-space';
      const mockAgents = [{ id: 'agent-1', local_metadata: { host: { name: 'host-1' } } }];

      mockGetByIds.mockResolvedValue(mockAgents);

      mockOsqueryContext.service.getActiveSpace = jest
        .fn()
        .mockResolvedValue({ id: customSpaceId, name: 'Custom Space' });

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockAgentService.asInternalScopedUser).toHaveBeenCalledWith(customSpaceId);
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should use default space when no active space returned', async () => {
      const mockAgents = [{ id: 'agent-1', local_metadata: { host: { name: 'host-1' } } }];

      mockGetByIds.mockResolvedValue(mockAgents);

      mockOsqueryContext.service.getActiveSpace = jest.fn().mockResolvedValue(undefined);

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockAgentService.asInternalScopedUser).toHaveBeenCalledWith(DEFAULT_SPACE_ID);
      expect(mockResponse.ok).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should return empty array when agent service is unavailable', async () => {
      mockOsqueryContext.service.getAgentService = jest.fn().mockReturnValue(null);

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: [],
        },
      });

      expect(mockGetByIds).not.toHaveBeenCalled();
    });

    it('should return 500 error when Fleet service throws error', async () => {
      const errorMessage = 'Fleet service connection failed';
      mockGetByIds.mockRejectedValue(new Error(errorMessage));

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch bulk agent details')
      );

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Failed to fetch agent details',
        },
      });
    });

    it('should handle empty agent IDs array', async () => {
      mockGetByIds.mockResolvedValue([]);

      const mockRequest = createMockRequest([]);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockGetByIds).toHaveBeenCalledWith([], { ignoreMissing: true });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: [],
        },
      });
    });
  });

  describe('Agent data structure', () => {
    it('should preserve local_metadata in agent response', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          local_metadata: {
            host: {
              name: 'hostname-1',
              architecture: 'x86_64',
              ip: ['192.168.1.10'],
            },
            elastic: {
              agent: {
                version: '8.0.0',
              },
            },
          },
        },
      ];

      mockGetByIds.mockResolvedValue(mockAgents);

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: expect.arrayContaining([
            expect.objectContaining({
              id: 'agent-1',
              local_metadata: expect.objectContaining({
                host: expect.objectContaining({
                  name: 'hostname-1',
                  architecture: 'x86_64',
                }),
              }),
            }),
          ]),
        },
      });
    });

    it('should handle agents without local_metadata', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
        },
      ];

      mockGetByIds.mockResolvedValue(mockAgents);

      const mockRequest = createMockRequest(['agent-1']);
      const mockResponse = createMockResponse();

      await routeHandler(mockContext as never, mockRequest as never, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: [{ id: 'agent-1' }],
        },
      });
    });
  });

  describe('Large scale scenarios (10k+ agents context)', () => {
    it('should efficiently handle 100 agents (typical page size)', async () => {
      const agentIds = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
      const mockAgents = agentIds.map((id) => ({
        id,
        local_metadata: { host: { name: `host-${id}` } },
      }));

      mockGetByIds.mockResolvedValue(mockAgents);

      const mockRequest = createMockRequest(agentIds);
      const mockResponse = createMockResponse();

      const startTime = Date.now();
      await routeHandler(mockContext as never, mockRequest as never, mockResponse);
      const duration = Date.now() - startTime;

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          agents: mockAgents,
        },
      });

      expect(duration).toBeLessThan(100);
    });

    it('should support pagination across 10 pages (1000 agents)', async () => {
      const pages = 10;
      const pageSize = 100;

      for (let page = 0; page < pages; page++) {
        const startIndex = page * pageSize;
        const agentIds = Array.from({ length: pageSize }, (_, i) => `agent-${startIndex + i}`);
        const mockAgents = agentIds.map((id) => ({
          id,
          local_metadata: { host: { name: `host-${id}` } },
        }));

        mockGetByIds.mockResolvedValue(mockAgents);

        const mockRequest = createMockRequest(agentIds);
        const mockResponse = createMockResponse();

        await routeHandler(mockContext as never, mockRequest as never, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            agents: mockAgents,
          },
        });
      }

      expect(mockGetByIds).toHaveBeenCalledTimes(pages);
    });
  });
});
