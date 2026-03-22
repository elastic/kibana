/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  WorkflowNotFoundError,
  WorkflowExecutionError,
  WorkflowTimeoutError,
  SkillNotFoundError,
  SkillValidationNotPassedError,
  SkillAlreadyDeployedError,
} from './aesop_errors';

describe('AESOP Error Classes', () => {
  describe('WorkflowNotFoundError', () => {
    it('should create error with correct properties', () => {
      const error = new WorkflowNotFoundError('test-workflow');

      expect(error.message).toContain('test-workflow');
      expect(error.statusCode).toBe(404);
      expect(error.retryable).toBe(false);
      expect(error.metadata).toEqual({ workflowId: 'test-workflow' });
    });

    it('should include suggested fix in message', () => {
      const error = new WorkflowNotFoundError('missing-workflow');

      expect(error.message).toMatch(/available workflows|check workflow/i);
    });
  });

  describe('WorkflowExecutionError', () => {
    it('should create error with execution details', () => {
      const originalError = new Error('ES query failed');
      const error = new WorkflowExecutionError('test-workflow', 'step-3', originalError);

      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(true);
      expect(error.metadata).toEqual({
        workflowId: 'test-workflow',
        failedStep: 'step-3',
        originalError: 'ES query failed',
      });
    });
  });

  describe('WorkflowTimeoutError', () => {
    it('should format timeout duration correctly', () => {
      const error = new WorkflowTimeoutError('long-running-workflow', 7200);

      expect(error.message).toContain('7200');
      expect(error.message).toMatch(/timeout|exceeded/i);
      expect(error.statusCode).toBe(408);
      expect(error.retryable).toBe(true);
    });
  });

  describe('SkillValidationNotPassedError', () => {
    it('should include eval score in metadata', () => {
      const error = new SkillValidationNotPassedError('test-skill', 0.65, 0.80);

      expect(error.metadata).toEqual({
        skillId: 'test-skill',
        actualScore: 0.65,
        requiredScore: 0.80,
      });
      expect(error.retryable).toBe(false);
    });

    it('should suggest increasing iterations', () => {
      const error = new SkillValidationNotPassedError('bad-skill', 0.5, 0.9);

      expect(error.message).toMatch(/iteration|improve|score/i);
    });
  });

  describe('SkillAlreadyDeployedError', () => {
    it('should prevent duplicate deployments', () => {
      const error = new SkillAlreadyDeployedError('deployed-skill');

      expect(error.statusCode).toBe(409);
      expect(error.retryable).toBe(false);
      expect(error.message).toMatch(/already deployed|duplicate/i);
    });
  });

  describe('Error serialization', () => {
    it('should serialize to JSON for API responses', () => {
      const error = new WorkflowNotFoundError('test');
      const json = JSON.parse(JSON.stringify(error));

      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('statusCode', 404);
      expect(json).toHaveProperty('retryable', false);
      expect(json).toHaveProperty('metadata');
    });
  });
});
