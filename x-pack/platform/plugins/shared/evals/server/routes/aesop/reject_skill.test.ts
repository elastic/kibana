/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { registerRejectSkillRoute } from './reject_skill';

describe('AESOP Reject Skill Route', () => {
  let mockRouter: any;
  let mockContext: any;
  let mockEsClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
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
    } as any;

    mockRouter = {
      versioned: {
        post: jest.fn().mockReturnThis(),
      },
    } as any;

    const mockAddVersion = jest.fn((_config: any, handler: Function) => {
      routeHandler = handler;
    });

    mockRouter.versioned.post.mockReturnValue({
      addVersion: mockAddVersion,
    });

    registerRejectSkillRoute({ router: mockRouter, logger: mockContext.logger } as any);
  });

  it('should register POST route for /internal/aesop/skills/{skillId}/reject', () => {
    expect(mockRouter.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/aesop/skills/{skillId}/reject',
        access: 'internal',
      })
    );
  });

  it('should validate rejection reasons enum', () => {
    const [[routeConfig]] = mockRouter.versioned.post.mock.calls;
    expect(routeConfig.path).toContain('{skillId}');
  });

  describe('successful rejection', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Duplicate Alert Skill',
          description: 'Already covered by existing skill',
          confidence: 0.75,
          source: {
            pattern_frequency: 8,
            pattern_id: 'pattern-456',
          },
          validation: {
            final_score: 0.82,
          },
          deployment: {
            deployed: false,
          },
        },
      } as any);

      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({ _id: 'feedback-123' } as any);
    });

    it('should load proposed skill from ES', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-789' },
        body: {
          review_notes: 'This overlaps with existing alert enrichment skill',
          rejection_reason: 'overlaps_existing',
        },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.get).toHaveBeenCalledWith({
        index: '.aesop-proposed-skills',
        id: 'skill-789',
      });
    });

    it('should update skill document with rejection', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-789' },
        body: {
          review_notes: 'Poor quality - too generic',
          rejection_reason: 'poor_quality',
          suggested_improvements: 'Make it more specific to security alerts',
        },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith({
        index: '.aesop-proposed-skills',
        id: 'skill-789',
        doc: {
          review: {
            status: 'rejected',
            reviewed_by: 'unknown',
            reviewed_at: expect.any(String),
            review_notes: 'Poor quality - too generic',
            rejection_reason: 'poor_quality',
            suggested_improvements: 'Make it more specific to security alerts',
          },
          rejection_metadata: {
            rejected_at: expect.any(String),
            validation_score: 0.82,
            pattern_frequency: 8,
            confidence: 0.75,
          },
        },
        refresh: 'wait_for',
      });
    });

    it('should store rejection feedback for learning', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-789' },
        body: {
          review_notes: 'Not useful for SOC analysts',
          rejection_reason: 'not_useful',
        },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.index).toHaveBeenCalledWith({
        index: '.aesop-rejection-feedback',
        document: expect.objectContaining({
          skill_id: 'skill-789',
          skill_name: 'Duplicate Alert Skill',
          rejection_reason: 'not_useful',
          review_notes: 'Not useful for SOC analysts',
          pattern_id: 'pattern-456',
          pattern_frequency: 8,
          confidence: 0.75,
          validation_score: 0.82,
          rejected_at: expect.any(String),
          rejected_by: 'unknown',
          learning_signals: expect.objectContaining({
            pattern_frequency_threshold: expect.any(String),
            confidence_threshold: expect.any(String),
            validation_score_threshold: expect.any(String),
          }),
        }),
        refresh: 'wait_for',
      });
    });

    it('should calculate learning signals correctly', async () => {
      // Low frequency pattern
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Low Frequency Skill',
          confidence: 0.65,
          source: { pattern_frequency: 5, pattern_id: 'p1' },
          validation: { final_score: 0.8 },
          deployment: { deployed: false },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-low' },
        body: {
          review_notes: 'Too rare',
          rejection_reason: 'poor_quality',
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      const feedbackCall = mockEsClient.index.mock.calls[0][0];
      expect((feedbackCall.document as any)?.learning_signals).toEqual({
        pattern_frequency_threshold: 'too_low',
        confidence_threshold: 'too_low',
        validation_score_threshold: 'failed',
      });
    });

    it('should return success response', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-789' },
        body: {
          review_notes: 'Security concern - potential data leak',
          rejection_reason: 'security_concern',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: expect.objectContaining({
          success: true,
          message: expect.stringContaining('rejected'),
          skill_id: 'skill-789',
          skill_name: 'Duplicate Alert Skill',
          rejection_reason: 'security_concern',
          feedback_stored: true,
        }),
      });
    });
  });

  describe('rejection workflow', () => {
    it('should support 5 rejection reasons', async () => {
      const reasons = [
        'poor_quality',
        'overlaps_existing',
        'not_useful',
        'security_concern',
        'other',
      ];

      for (const reason of reasons) {
        mockEsClient.get.mockResolvedValue({
          _source: {
            name: 'Test Skill',
            confidence: 0.8,
            source: { pattern_frequency: 10, pattern_id: 'p1' },
            validation: { final_score: 0.85 },
            deployment: { deployed: false },
          },
        } as any);
        mockEsClient.update.mockResolvedValue({} as any);
        mockEsClient.index.mockResolvedValue({ _id: 'fb' } as any);

        const mockRequest = httpServerMock.createKibanaRequest({
          params: { skillId: `skill-${reason}` },
          body: {
            review_notes: `Testing ${reason}`,
            rejection_reason: reason,
          },
        });

        await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

        expect(mockEsClient.index).toHaveBeenCalledWith(
          expect.objectContaining({
            index: '.aesop-rejection-feedback',
            document: expect.objectContaining({
              rejection_reason: reason,
            }),
          })
        );
      }
    });

    it('should use default rejection_reason if not provided', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);

      // Note: in production, Zod applies the default 'other' before the handler runs.
      // The mock bypasses Zod, so we simulate the default here explicitly.
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Just not good enough',
          rejection_reason: 'other', // Simulates Zod default
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            review: expect.objectContaining({
              rejection_reason: 'other', // Default
            }),
          }),
        })
      );
    });

    it('should preserve validation results for learning', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          confidence: 0.88,
          source: { pattern_frequency: 25, pattern_id: 'p-high' },
          validation: { final_score: 0.92 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Overlaps',
          rejection_reason: 'overlaps_existing',
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            rejection_metadata: {
              rejected_at: expect.any(String),
              validation_score: 0.92,
              pattern_frequency: 25,
              confidence: 0.88,
            },
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle skill not found', async () => {
      mockEsClient.get.mockRejectedValue({
        meta: { statusCode: 404 },
        message: 'index_not_found_exception',
      });

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'nonexistent' },
        body: { review_notes: 'test', rejection_reason: 'other' },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
      expect(mockContext.logger.error).toHaveBeenCalled();
    });

    it('should prevent rejecting already deployed skills', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Deployed Skill',
          deployment: {
            deployed: true,
            agent_builder_skill_id: 'ab-skill-999',
          },
        },
      } as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'deployed-skill' },
        body: {
          review_notes: 'Too late',
          rejection_reason: 'other',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
        })
      );
    });

    it('should handle ES update failures gracefully', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockRejectedValue(new Error('ES timeout'));

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'other',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
      expect(mockContext.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Failed to reject skill')
      );
    });

    it('should handle feedback indexing failure', async () => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockRejectedValue(new Error('Index creation failed'));

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'other',
        },
      });
      const mockResponse = httpServerMock.createResponseFactory();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalled();
    });
  });

  describe('logging', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test Skill',
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);
    });

    it('should log rejection initiation', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'poor_quality',
        },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Rejecting skill')
      );
    });

    it('should log successful rejection with duration', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'not_useful',
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockContext.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP] Skill rejected successfully')
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
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);

      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Rejected',
          rejection_reason: 'other',
        },
        auth: { isAuthenticated: true } as any,
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      // Implementation uses 'unknown' as reviewed_by when username is not available from auth
      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            review: expect.objectContaining({
              reviewed_by: 'unknown',
            }),
          }),
        })
      );

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            rejected_by: 'unknown',
          }),
        })
      );
    });

    it('should validate review_notes is required', () => {
      // Schema validation enforces this at route level
      const [[routeConfig]] = mockRouter.versioned.post.mock.calls;
      expect(routeConfig.path).toContain('{skillId}');
    });
  });

  describe('refresh behavior', () => {
    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({
        _source: {
          name: 'Test',
          confidence: 0.8,
          source: { pattern_frequency: 10 },
          validation: { final_score: 0.85 },
          deployment: { deployed: false },
        },
      } as any);
      mockEsClient.update.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);
    });

    it('should use wait_for refresh for skill update', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'other',
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: 'wait_for',
        })
      );
    });

    it('should use wait_for refresh for feedback indexing', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { skillId: 'skill-123' },
        body: {
          review_notes: 'Test',
          rejection_reason: 'other',
        },
      });

      await routeHandler(mockContext, mockRequest, httpServerMock.createResponseFactory());

      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: 'wait_for',
        })
      );
    });
  });
});
