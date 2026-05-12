/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP APM Instrumentation Tests
 *
 * Tests for custom APM instrumentation service including:
 * - Workflow step instrumentation
 * - Agent invocation tracking
 * - Token usage extraction
 * - Error handling
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { APMInstrumentationService } from './apm_instrumentation';

describe('APMInstrumentationService', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let apmService: APMInstrumentationService;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    apmService = new APMInstrumentationService(esClient, logger);
  });

  describe('instrumentWorkflowStep', () => {
    it('should record successful workflow step execution', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const metadata = { workflow_name: 'test_workflow', step: 'schema_discovery' };

      const result = await apmService.instrumentWorkflowStep(
        'schema_discovery',
        metadata,
        mockOperation
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);

      // Verify span was recorded
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'workflow.step.schema_discovery',
            type: 'workflow_execution',
            outcome: 'success',
            metadata,
          }),
        })
      );

      // Verify duration was tracked
      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.duration_ms).toBeGreaterThanOrEqual(0);
      expect(indexCall.document['@timestamp']).toBeDefined();
      expect(indexCall.document.span_id).toBeDefined();
    });

    it('should record failed workflow step execution', async () => {
      const mockError = new Error('Test error');
      const mockOperation = jest.fn().mockRejectedValue(mockError);
      const metadata = { workflow_name: 'test_workflow' };

      await expect(
        apmService.instrumentWorkflowStep('failing_step', metadata, mockOperation)
      ).rejects.toThrow('Test error');

      // Verify error span was recorded
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'workflow.step.failing_step',
            type: 'workflow_execution',
            outcome: 'failure',
            error: 'Test error',
            metadata,
          }),
        })
      );
    });

    it('should not fail operation if metrics recording fails', async () => {
      esClient.index.mockRejectedValue(new Error('Elasticsearch down'));
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await apmService.instrumentWorkflowStep('test_step', {}, mockOperation);

      expect(result).toBe('success');
      // Implementation logs as template string, not structured log
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP APM] Failed to record span')
      );
    });
  });

  describe('instrumentAgentCall', () => {
    it('should record successful agent invocation with token usage', async () => {
      const mockResult = {
        content: 'Agent response',
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
          cached_tokens: 800,
        },
      };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await apmService.instrumentAgentCall(
        'aesop.schema_categorizer',
        mockOperation
      );

      expect(result).toEqual(mockResult);

      // Verify span was recorded with token usage
      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'agent.invoke.aesop.schema_categorizer',
            type: 'agent_execution',
            outcome: 'success',
            metadata: expect.objectContaining({
              agent_id: 'aesop.schema_categorizer',
              prompt_tokens: 1000,
              completion_tokens: 500,
              total_tokens: 1500,
              cached_tokens: 800,
              cache_hit_rate: 80, // 800/1000 * 100
            }),
          }),
        })
      );
    });

    it('should record agent invocation without token usage', async () => {
      const mockResult = { content: 'Response without usage data' };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      await apmService.instrumentAgentCall('test_agent', mockOperation);

      // Verify span was recorded without token fields
      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.metadata.agent_id).toBe('test_agent');
      expect(indexCall.document.metadata.prompt_tokens).toBeUndefined();
    });

    it('should record failed agent invocation', async () => {
      const mockError = new Error('Agent timeout');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(apmService.instrumentAgentCall('test_agent', mockOperation)).rejects.toThrow(
        'Agent timeout'
      );

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'agent.invoke.test_agent',
            type: 'agent_execution',
            outcome: 'failure',
            error: 'Agent timeout',
          }),
        })
      );
    });
  });

  describe('instrumentSkillValidation', () => {
    it('should record successful skill validation', async () => {
      const mockResult = { valid: true, score: 0.95 };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      const result = await apmService.instrumentSkillValidation(
        'skill_123',
        'syntax',
        mockOperation
      );

      expect(result).toEqual(mockResult);

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'skill.validation.syntax',
            type: 'skill_validation',
            outcome: 'success',
            metadata: {
              skill_id: 'skill_123',
              validation_type: 'syntax',
            },
          }),
        })
      );
    });

    it('should record failed skill validation', async () => {
      const mockError = new Error('Validation failed');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(
        apmService.instrumentSkillValidation('skill_123', 'security', mockOperation)
      ).rejects.toThrow('Validation failed');

      expect(esClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          document: expect.objectContaining({
            name: 'skill.validation.security',
            type: 'skill_validation',
            outcome: 'failure',
            error: 'Validation failed',
          }),
        })
      );
    });
  });

  describe('ensureMetricsIndex', () => {
    it('should create metrics index if it does not exist', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockResolvedValue({} as any);

      await apmService.ensureMetricsIndex();

      expect(esClient.indices.exists).toHaveBeenCalledWith({
        index: 'aesop_metrics',
      });

      // ES client v8 API: mappings passed directly (no body wrapper)
      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'aesop_metrics',
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              '@timestamp': { type: 'date' },
              span_id: { type: 'keyword' },
              name: { type: 'keyword' },
              type: { type: 'keyword' },
              duration_ms: { type: 'long' },
              outcome: { type: 'keyword' },
            }),
          }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Metrics index created'));
    });

    it('should skip creation if index already exists', async () => {
      esClient.indices.exists.mockResolvedValue(true);

      await apmService.ensureMetricsIndex();

      expect(esClient.indices.exists).toHaveBeenCalled();
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('should handle creation errors gracefully', async () => {
      esClient.indices.exists.mockResolvedValue(false);
      esClient.indices.create.mockRejectedValue(new Error('Creation failed'));

      await apmService.ensureMetricsIndex();

      // Implementation logs as template string, not structured log
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP APM] Failed to create metrics index')
      );
    });
  });

  describe('Token usage extraction', () => {
    it('should extract token usage from standard LLM response', async () => {
      const mockResult = {
        content: 'Response',
        usage: {
          prompt_tokens: 2000,
          completion_tokens: 1000,
          total_tokens: 3000,
        },
      };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      await apmService.instrumentAgentCall('test_agent', mockOperation);

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.metadata.prompt_tokens).toBe(2000);
      expect(indexCall.document.metadata.completion_tokens).toBe(1000);
      expect(indexCall.document.metadata.total_tokens).toBe(3000);
    });

    it('should calculate total tokens if not provided', async () => {
      const mockResult = {
        content: 'Response',
        usage: {
          prompt_tokens: 1500,
          completion_tokens: 800,
        },
      };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      await apmService.instrumentAgentCall('test_agent', mockOperation);

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.metadata.total_tokens).toBe(2300); // 1500 + 800
    });

    it('should calculate cache hit rate when cached tokens available', async () => {
      const mockResult = {
        content: 'Response',
        usage: {
          prompt_tokens: 2000,
          completion_tokens: 500,
          cached_tokens: 1200,
        },
      };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      await apmService.instrumentAgentCall('test_agent', mockOperation);

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.metadata.cache_hit_rate).toBe(60); // 1200/2000 * 100
    });

    it('should handle missing usage data gracefully', async () => {
      const mockResult = { content: 'Response without usage' };
      const mockOperation = jest.fn().mockResolvedValue(mockResult);

      await apmService.instrumentAgentCall('test_agent', mockOperation);

      const indexCall = esClient.index.mock.calls[0][0] as any;
      expect(indexCall.document.metadata.prompt_tokens).toBeUndefined();
      expect(indexCall.document.metadata.total_tokens).toBeUndefined();
    });
  });
});
