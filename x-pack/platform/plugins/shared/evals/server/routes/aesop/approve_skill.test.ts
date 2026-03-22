/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { EvalsRequestHandlerContext } from '../../types';
import { registerApproveSkillRoute } from './approve_skill';
import type { IRouter } from '@kbn/core/server';

describe('AESOP Approve Skill Route', () => {
  let mockRouter: jest.Mocked<IRouter<EvalsRequestHandlerContext>>;
  let mockContext: jest.Mocked<EvalsRequestHandlerContext>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockAgentBuilderClient: any;
  let routeHandler: any;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();

    mockAgentBuilderClient = {
      createSkill: jest.fn().mockResolvedValue({
        id: 'ab-skill-123',
        name: 'Test Skill',
      }),
    };

    mockContext = {
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
        savedObjects: {} as any,
      },
      evals: {
        datasetService: {} as any,
      },
      agentBuilder: {
        getClient: jest.fn().mockResolvedValue(mockAgentBuilderClient),
      } as any,
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
      } as any,
    } as any;

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

    registerApproveSkillRoute(mockRouter);
  });

  it('should register POST route for /internal/aesop/skills/{skillId}/approve', () => {
    expect(mockRouter.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/skills/{skillId}/approve',
        access: 'internal',
      })
    );
  });

  it('should validate skillId parameter', () => {
    const [[routeConfig]] = mockRouter.versioned.post.mock.calls;
    expect(routeConfig.path).toContain('{skillId}');
  });

  describe('successful approval', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Alert Investigation Skill',
          description: 'Helps investigate security alerts',
          markdown: '# Alert Investigation\n\nInstructions...',
          tools: ['search_alerts', 'get_alert_details'],
          validation: {
            status: 'passed',
            final_score: 0.92,
          },
          source: {
            pattern_frequency: 15,
          },
          metadata: {
            discovery_trace_id: 'trace-123',
          },
        },
      } as any);

      mockEsClient.update.mockResolvedValue({} as any);
    });

    it('should load proposed skill from ES', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { review_notes: 'Looks good!' },
        auth: { credentials: { username: 'test-user' } },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.get).toHaveBeenCalledWith({
        index: '.aesop-proposed-skills',
        id: 'skill-123',
      });
    });

    it('should deploy skill to Agent Builder', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { review_notes: 'Looks good!' },
        auth: { credentials: { username: 'test-user' } },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockAgentBuilderClient.createSkill).toHaveBeenCalledWith({
        name: 'Alert Investigation Skill',
        description: 'Helps investigate security alerts',
        content: '# Alert Investigation\n\nInstructions...',
        tools: ['search_alerts', 'get_alert_details'],
        labels: ['aesop-generated', 'auto-discovered'],
        metadata: expect.objectContaining({
          source: 'aesop',
          aesop_skill_id: 'skill-123',
          discovery_trace_id: 'trace-123',
          eval_score: 0.92,
          pattern_frequency: 15,
          approved_at: expect.any(String),
        }),
      });
    });

    it('should update skill document with approval', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { review_notes: 'Approved for production' },
        auth: { credentials: { username: 'reviewer@elastic.co' } },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith({
        index: '.aesop-proposed-skills',
        id: 'skill-123',
        body: {
          doc: {
            review: {
              status: 'approved',
              reviewed_by: 'reviewer@elastic.co',
              reviewed_at: expect.any(String),
              review_notes: 'Approved for production',
            },
            deployment: {
              deployed: true,
              agent_builder_skill_id: 'ab-skill-123',
              deployed_at: expect.any(String),
            },
          },
        },
      });
    });

    it('should return success response with Agent Builder skill ID', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { credentials: { username: 'test-user' } },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: {
          success: true,
          message: 'Skill approved and deployed to Agent Builder',
          agent_builder_skill_id: 'ab-skill-123',
        },
      });
    });

    it('should log approval workflow', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { credentials: { username: 'test-user' } },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[AESOP] Deploying skill to Agent Builder',
        { skill_id: 'skill-123' }
      );

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        '[AESOP] Skill deployed to Agent Builder',
        {
          aesop_skill_id: 'skill-123',
          agent_builder_skill_id: 'ab-skill-123',
        }
      );
    });
  });

  describe('validation errors', () => {
    it('should reject if skill not found', async () => {
      mockEsClient.get.mockRejectedValue({
        meta: { statusCode: 404 },
        message: 'not found',
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'nonexistent-skill' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: expect.objectContaining({
          message: expect.stringContaining('Failed to approve skill'),
        }),
      });
    });

    it('should reject if skill validation not passed', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Failed Skill',
          validation: {
            status: 'failed',
            final_score: 0.65,
          },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('must pass validation before approval'),
        },
      });
    });

    it('should reject if skill validation pending', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Pending Skill',
          validation: {
            status: 'pending',
          },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });

  describe('Agent Builder integration', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test Skill',
          description: 'Test',
          markdown: '# Test',
          tools: [],
          validation: { status: 'passed', final_score: 0.9 },
          source: { pattern_frequency: 10 },
          metadata: { discovery_trace_id: 'trace-1' },
        },
      } as any);
    });

    it('should handle Agent Builder client creation failure', async () => {
      mockContext.agentBuilder.getClient.mockRejectedValue(
        new Error('Agent Builder not configured')
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[AESOP] Failed to approve skill',
        expect.any(Object)
      );
    });

    it('should handle Agent Builder skill creation failure', async () => {
      mockAgentBuilderClient.createSkill.mockRejectedValue(
        new Error('Skill name already exists')
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: expect.objectContaining({
          message: expect.stringContaining('Skill name already exists'),
        }),
      });
    });

    it('should pass all required fields to Agent Builder', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      const createSkillCall = mockAgentBuilderClient.createSkill.mock.calls[0][0];
      expect(createSkillCall).toMatchObject({
        name: expect.any(String),
        description: expect.any(String),
        content: expect.any(String),
        tools: expect.any(Array),
        labels: expect.arrayContaining(['aesop-generated', 'auto-discovered']),
        metadata: expect.objectContaining({
          source: 'aesop',
          aesop_skill_id: 'skill-123',
        }),
      });
    });
  });

  describe('error recovery', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test Skill',
          description: 'Test',
          markdown: '# Test',
          tools: [],
          validation: { status: 'passed', final_score: 0.9 },
          source: { pattern_frequency: 10 },
          metadata: { discovery_trace_id: 'trace-1' },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
    });

    it('should handle ES update failure after successful deployment', async () => {
      mockEsClient.update.mockRejectedValue(new Error('ES connection lost'));

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      // Should still fail even though deployment succeeded
      expect(mockResponse.customError).toHaveBeenCalled();
    });

    it('should log detailed error information', async () => {
      mockAgentBuilderClient.createSkill.mockRejectedValue(
        new Error('Network timeout')
      );

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockContext.logger.error).toHaveBeenCalledWith(
        '[AESOP] Failed to approve skill',
        expect.objectContaining({
          error: expect.any(Error),
          skill_id: 'skill-123',
        })
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

    it('should track reviewer username', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          validation: { status: 'passed', final_score: 0.9 },
          source: { pattern_frequency: 10 },
          metadata: {},
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { credentials: { username: 'security-lead@elastic.co' } },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            doc: expect.objectContaining({
              review: expect.objectContaining({
                reviewed_by: 'security-lead@elastic.co',
              }),
            }),
          },
        })
      );
    });

    it('should default to unknown if username not available', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          validation: { status: 'passed', final_score: 0.9 },
          source: { pattern_frequency: 10 },
          metadata: {},
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: {},
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            doc: expect.objectContaining({
              review: expect.objectContaining({
                reviewed_by: 'unknown',
              }),
            }),
          },
        })
      );
    });
  });
});
