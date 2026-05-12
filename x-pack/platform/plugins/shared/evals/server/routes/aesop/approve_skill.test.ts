/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpServerMock,
  loggingSystemMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import {
  registerApproveSkillRoute,
  sanitizeSkillId,
  sanitizeSkillName,
  inferTools,
} from './approve_skill';

describe('approve_skill helpers', () => {
  describe('sanitizeSkillId', () => {
    it('converts to lowercase and replaces invalid chars with hyphens', () => {
      expect(sanitizeSkillId('My Skill Name')).toBe('my-skill-name');
    });

    it('collapses consecutive hyphens', () => {
      expect(sanitizeSkillId('foo---bar')).toBe('foo-bar');
    });

    it('truncates to 64 characters', () => {
      const longInput = 'a'.repeat(100);
      const result = sanitizeSkillId(longInput);
      expect(result.length).toBeLessThanOrEqual(64);
    });

    it('strips leading and trailing non-alphanumeric characters', () => {
      expect(sanitizeSkillId('-leading-trailing-')).toBe('leading-trailing');
    });

    it('returns aesop- prefixed fallback when result does not match regex', () => {
      // An input that produces an empty string after sanitization
      const result = sanitizeSkillId('---');
      expect(result).toMatch(/^aesop-/);
    });

    it('handles empty string input', () => {
      const result = sanitizeSkillId('');
      expect(result).toMatch(/^aesop-/);
    });

    it('preserves valid lowercase alphanumeric IDs', () => {
      expect(sanitizeSkillId('valid-id-123')).toBe('valid-id-123');
    });

    it('handles underscores as valid characters', () => {
      expect(sanitizeSkillId('skill_name_123')).toBe('skill_name_123');
    });
  });

  describe('sanitizeSkillName', () => {
    it('removes special characters but keeps spaces, hyphens, and underscores', () => {
      expect(sanitizeSkillName('My Skill (v2)!')).toBe('My Skill v2');
    });

    it('truncates to 64 characters', () => {
      const longName = 'A'.repeat(100);
      const result = sanitizeSkillName(longName);
      expect(result.length).toBeLessThanOrEqual(64);
    });

    it('strips leading and trailing non-alphanumeric characters', () => {
      expect(sanitizeSkillName(' -name- ')).toBe('name');
    });

    it('returns fallback "AESOP Skill" for names that fail regex validation', () => {
      const result = sanitizeSkillName('!!!');
      expect(result).toBe('AESOP Skill');
    });

    it('preserves valid names', () => {
      expect(sanitizeSkillName('Alert Investigation Skill')).toBe('Alert Investigation Skill');
    });

    it('handles empty string', () => {
      const result = sanitizeSkillName('');
      expect(result).toBe('AESOP Skill');
    });
  });

  describe('inferTools', () => {
    it('infers execute_esql from ES|QL content', () => {
      const markdown = 'Use ES|QL query to find suspicious processes';
      const tools = inferTools(markdown);
      expect(tools).toContain('platform.core.execute_esql');
    });

    it('infers generate_esql from query content', () => {
      const markdown = 'Generate a query for endpoint events';
      const tools = inferTools(markdown);
      expect(tools).toContain('platform.core.generate_esql');
    });

    it('infers create_visualization from visualization content', () => {
      const markdown = 'Create a visualization showing alert trends';
      const tools = inferTools(markdown);
      expect(tools).toContain('platform.core.create_visualization');
    });

    it('infers detection rule tool from alert/detection content', () => {
      const markdown = 'Create a detection rule for privilege escalation';
      const tools = inferTools(markdown);
      expect(tools).toContain('security.create_detection_rule');
    });

    it('returns empty array for content without tool keywords', () => {
      const markdown = 'This is a plain text skill with no special keywords';
      const tools = inferTools(markdown);
      expect(tools).toHaveLength(0);
    });

    it('handles empty/undefined markdown', () => {
      expect(inferTools('')).toHaveLength(0);
      expect(inferTools(undefined as any)).toHaveLength(0);
    });

    it('deduplicates tools', () => {
      const markdown = 'Use esql and ES|QL to query data with esql';
      const tools = inferTools(markdown);
      // Both 'esql' keywords map to execute_esql and generate_esql, but each should appear once
      const uniqueTools = new Set(tools);
      expect(tools.length).toBe(uniqueTools.size);
    });

    it('is case-insensitive', () => {
      const markdown = 'Use ESQL to build a DASHBOARD with VISUALIZATION';
      const tools = inferTools(markdown);
      expect(tools).toContain('platform.core.execute_esql');
      expect(tools).toContain('platform.core.create_visualization');
    });
  });
});

describe('POST /internal/aesop/skills/{skillId}/approve', () => {
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let routeHandler: Function;
  let mockRouter: any;
  let mockSkillRegistry: any;

  const createMockContext = () =>
    ({
      core: Promise.resolve({
        elasticsearch: {
          client: {
            asCurrentUser: mockEsClient,
          },
        },
      }),
      evals: Promise.resolve({
        getAgentBuilderStart: () => ({
          skills: {
            getRegistry: jest.fn().mockResolvedValue(mockSkillRegistry),
          },
        }),
      }),
    } as any);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggingSystemMock.createLogger();
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockResponse = httpServerMock.createResponseFactory();
    mockSkillRegistry = {
      create: jest.fn().mockResolvedValue({ id: 'aesop-skill-123' }),
      update: jest.fn().mockResolvedValue({ id: 'existing-skill-id' }),
    };

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnValue({
          addVersion: jest.fn((_config: any, handler: Function) => {
            routeHandler = handler;
          }),
        }),
      },
    } as any;

    registerApproveSkillRoute({ router: mockRouter, logger: mockLogger });
  });

  describe('route registration', () => {
    it('should register POST route for /internal/aesop/skills/{skillId}/approve', () => {
      expect(mockRouter.versioned.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/aesop/skills/{skillId}/approve',
          access: 'internal',
          security: {
            authz: {
              requiredPrivileges: ['evals'],
            },
          },
        })
      );
    });
  });

  describe('validation gate', () => {
    it('should reject if skill validation status is not "passed"', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Failed Skill',
          validation: { status: 'failed' },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('must pass validation before approval'),
        },
      });
    });

    it('should reject if skill validation status is "pending"', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Pending Skill',
          validation: { status: 'pending' },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('Current status: pending'),
        },
      });
    });

    it('should reject if validation is undefined', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'No Validation Skill',
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: {
          message: expect.stringContaining('Current status: pending'),
        },
      });
    });
  });

  describe('successful approval', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Alert Investigation',
          description: 'Investigates security alerts using ES|QL queries',
          markdown: '# Alert Investigation\n\nUse ES|QL query to find suspicious processes',
          validation: { status: 'passed', final_score: 0.92 },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
    });

    it('should create skill in Agent Builder with sanitized fields', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { review_notes: 'Looks good' },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSkillRegistry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alert Investigation',
          description: expect.any(String),
          content: expect.any(String),
          tool_ids: expect.any(Array),
        })
      );
    });

    it('should infer tools from skill markdown content', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      const createCall = mockSkillRegistry.create.mock.calls[0][0];
      // The markdown contains "ES|QL query" so it should infer esql tools
      expect(createCall.tool_ids).toContain('platform.core.execute_esql');
    });

    it('should update skill document with approval and deployment info', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { review_notes: 'Approved for production' },
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      // The implementation makes two update calls:
      // 1. Marks deployment intent (review + deployment sans agent_builder_skill_id)
      // 2. Sets agent_builder_skill_id after Agent Builder creation
      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-proposed-skills',
          id: 'skill-123',
          doc: expect.objectContaining({
            review: expect.objectContaining({
              status: 'approved',
              reviewed_at: expect.any(String),
              review_notes: 'Approved for production',
            }),
            deployment: expect.objectContaining({
              deployed: true,
              deployed_at: expect.any(String),
              tool_ids: expect.any(Array),
              updated_existing: false,
            }),
          }),
          refresh: 'wait_for',
        })
      );
      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-proposed-skills',
          id: 'skill-123',
          doc: {
            deployment: {
              agent_builder_skill_id: 'aesop-skill-123',
            },
          },
        })
      );
    });

    it('should return success response with agent_builder_skill_id', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          success: true,
          skill_id: 'skill-123',
          agent_builder_skill_id: 'aesop-skill-123',
          tool_ids: expect.any(Array),
        }),
      });
    });

    it('should default reviewed_by to "unknown" when username is not available', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            review: expect.objectContaining({
              reviewed_by: 'unknown',
            }),
          }),
        })
      );
    });
  });

  describe('update existing skill', () => {
    it('should update existing skill when update_existing is true and base_skill is writable', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Updated Skill',
          description: 'Updated description',
          markdown: '# Updated',
          validation: { status: 'passed' },
          base_skill: { id: 'existing-skill-id', readonly: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: { update_existing: true },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockSkillRegistry.update).toHaveBeenCalledWith(
        'existing-skill-id',
        expect.objectContaining({
          name: 'Updated Skill',
        })
      );
      expect(mockSkillRegistry.create).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 when ES get fails (skill not found)', async () => {
      mockEsClient.get.mockRejectedValue(new Error('document_missing_exception'));

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'nonexistent' },
        body: {},
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Failed to approve skill'),
        },
      });
    });

    it('should return 500 when Agent Builder is not available', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          validation: { status: 'passed' },
          markdown: '',
        },
      } as any);

      const contextWithNoAgentBuilder = {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: mockEsClient } },
        }),
        evals: Promise.resolve({
          getAgentBuilderStart: () => undefined,
        }),
      } as any;

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(contextWithNoAgentBuilder, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: expect.stringContaining('Agent Builder plugin not available'),
        },
      });
    });

    it('should log error details on failure', async () => {
      mockEsClient.get.mockRejectedValue(new Error('Connection refused'));

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {},
      });

      await routeHandler(createMockContext(), mockRequest, mockResponse);

      // Implementation logs as a template string, not structured log
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Failed to approve skill')
      );
    });
  });
});
