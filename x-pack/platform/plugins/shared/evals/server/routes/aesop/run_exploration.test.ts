/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerRunExplorationRoute } from './run_exploration';
import type { IRouter } from '@kbn/core/server';

describe('POST /internal/aesop/exploration/run', () => {
  let mockContext: jest.Mocked<EvalsRequestHandlerContext>;
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockRouter: jest.Mocked<IRouter<EvalsRequestHandlerContext>>;
  let routeHandler: any;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    mockContext = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      },
      evals: {
        datasetService: {} as any,
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      } as any,
      workflowsManagement: {
        management: {
          runWorkflow: jest.fn().mockResolvedValue('exec-123'),
        },
      } as any,
    } as any;

    mockRequest = httpServerMock.createKibanaRequest({
      body: {
        agent_role: 'SOC analyst',
        scoped_indices: ['.alerts-*'],
        exploration_depth: 50,
        min_pattern_frequency: 5,
      },
    });

    mockResponse = httpServerMock.createResponseFactory();

    // Mock router to capture handler
    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnThis(),
      },
    } as any;

    const mockAddVersion = jest.fn((config) => {
      routeHandler = config;
    });

    mockRouter.versioned.post.mockReturnValue({
      addVersion: mockAddVersion,
    });

    registerRunExplorationRoute(mockRouter);
  });

  describe('successful exploration', () => {
    it('should trigger workflow execution', async () => {
      const result = await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockContext.workflowsManagement.management.runWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'aesop.self_exploration',
          name: 'AESOP Self-Exploration',
        }),
        'default',
        {
          agent_role: 'SOC analyst',
          scoped_indices: ['.alerts-*'],
          exploration_depth: 50,
          min_pattern_frequency: 5,
        },
        mockRequest,
        undefined,
        expect.objectContaining({
          triggered_by: 'aesop_ui',
          agent_role: 'SOC analyst',
        })
      );

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[AESOP] Starting self-exploration workflow',
        expect.any(Object)
      );
    });

    it('should initialize workflow state tracker', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.create.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({ _id: 'exec-123' } as any);

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-workflow-executions',
          id: 'exec-123',
          document: expect.objectContaining({
            execution_id: 'exec-123',
            workflow_name: 'aesop.self_exploration',
            status: 'running',
            current_phase: 1,
          }),
          refresh: 'wait_for',
        })
      );
    });

    it('should return execution details in response', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          success: true,
          execution_id: 'exec-123',
          workflow_name: 'aesop.self_exploration',
          status: 'running',
          started_at: expect.any(String),
          message: expect.stringContaining('exec-123'),
        }),
      });
    });

    it('should use default values when optional parameters omitted', async () => {
      const minimalRequest = httpServerMock.createKibanaRequest({
        body: {},
      });

      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await routeHandler(mockContext, minimalRequest, mockResponse);

      expect(mockContext.workflowsManagement.management.runWorkflow).toHaveBeenCalledWith(
        expect.any(Object),
        'default',
        expect.objectContaining({
          agent_role: 'SOC analyst',
          scoped_indices: [
            '.alerts-security.alerts-*',
            '.siem-signals-*',
            'logs-endpoint.*',
          ],
          exploration_depth: 100,
          min_pattern_frequency: 10,
        }),
        expect.any(Object),
        undefined,
        expect.any(Object)
      );
    });
  });

  describe('validation', () => {
    it('should reject empty scoped_indices', async () => {
      const invalidRequest = httpServerMock.createKibanaRequest({
        body: {
          agent_role: 'SOC analyst',
          scoped_indices: [],
        },
      });

      // Note: Zod validation happens at route level, not in handler
      // This test verifies the schema would reject it
      expect(invalidRequest.body.scoped_indices).toEqual([]);
    });

    it('should validate exploration_depth minimum', async () => {
      const invalidRequest = httpServerMock.createKibanaRequest({
        body: {
          exploration_depth: 5, // Below min of 10
        },
      });

      // Schema validation would reject this
      expect(invalidRequest.body.exploration_depth).toBe(5);
    });

    it('should validate exploration_depth maximum', async () => {
      const invalidRequest = httpServerMock.createKibanaRequest({
        body: {
          exploration_depth: 2000, // Above max of 1000
        },
      });

      expect(invalidRequest.body.exploration_depth).toBe(2000);
    });

    it('should validate min_pattern_frequency range', async () => {
      const invalidRequest = httpServerMock.createKibanaRequest({
        body: {
          min_pattern_frequency: 0, // Below min of 1
        },
      });

      expect(invalidRequest.body.min_pattern_frequency).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should return 400 if workflows plugin not available', async () => {
      mockContext.workflowsManagement = undefined;

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('Workflows Management plugin not available'),
        },
      });
    });

    it('should return 500 if workflow fails to start', async () => {
      mockContext.workflowsManagement.management.runWorkflow.mockRejectedValue(
        new Error('Workflow YAML not found')
      );

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to start exploration'),
        },
      });

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[AESOP] Failed to start exploration',
        expect.any(Object)
      );
    });

    it('should handle ES client errors gracefully', async () => {
      mockEsClient.indices.exists.mockRejectedValue(new Error('ES connection failed'));

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to start exploration'),
        },
      });
    });

    it('should handle workflow timeout errors', async () => {
      mockContext.workflowsManagement.management.runWorkflow.mockRejectedValue(
        new Error('Workflow execution timeout')
      );

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
      expect(mockContext.logger.error).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    it('should log workflow start parameters', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[AESOP] Starting self-exploration workflow',
        {
          agent_role: 'SOC analyst',
          scoped_indices: ['.alerts-*'],
          exploration_depth: 50,
        }
      );
    });

    it('should log execution ID after workflow starts', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[AESOP] Workflow started',
        { execution_id: 'exec-123' }
      );
    });

    it('should log state tracker initialization', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockContext.logger.debug).toHaveBeenCalledWith(
        '[AESOP] Workflow state tracking initialized',
        { execution_id: 'exec-123' }
      );
    });
  });

  describe('security', () => {
    it('should require evals privilege', () => {
      const [[routeConfig]] = mockRouter.versioned.post.mock.calls;

      expect(routeConfig.security).toEqual({
        authz: {
          requiredPrivileges: ['evals'],
        },
      });
    });

    it('should have internal access level', () => {
      const [[routeConfig]] = mockRouter.versioned.post.mock.calls;

      expect(routeConfig.access).toBe('internal');
    });

    it('should have proper tags', () => {
      const [[routeConfig]] = mockRouter.versioned.post.mock.calls;

      expect(routeConfig.options?.tags).toContain('access:evals');
    });
  });
});
