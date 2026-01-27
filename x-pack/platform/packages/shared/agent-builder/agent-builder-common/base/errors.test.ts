/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAgentBuilderError,
  createInternalError,
  createToolNotFoundError,
  isInternalError,
  isToolNotFoundError,
  AgentBuilderErrorCode,
  createAgentBuilderError,
  isAgentNotFoundError,
  createAgentNotFoundError,
} from './errors';

describe('AgentBuilder errors', () => {
  describe('isAgentBuilderError', () => {
    it('should return true for a AgentBuilderError instance', () => {
      const error = createInternalError('test error');
      expect(isAgentBuilderError(error)).toBe(true);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isAgentBuilderError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAgentBuilderError(null)).toBe(false);
      expect(isAgentBuilderError(undefined)).toBe(false);
      expect(isAgentBuilderError('string')).toBe(false);
      expect(isAgentBuilderError({})).toBe(false);
    });
  });

  describe('isInternalError', () => {
    it('should return true for an internal error', () => {
      const error = createInternalError('test error');
      expect(isInternalError(error)).toBe(true);
    });

    it('should return false for a tool not found error', () => {
      const error = createToolNotFoundError({ toolId: 'test-tool' });
      expect(isInternalError(error)).toBe(false);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isInternalError(error)).toBe(false);
    });
  });

  describe('isToolNotFoundError', () => {
    it('should return true for a tool not found error', () => {
      const error = createToolNotFoundError({ toolId: 'test-tool' });
      expect(isToolNotFoundError(error)).toBe(true);
    });

    it('should return false for an internal error', () => {
      const error = createInternalError('test error');
      expect(isToolNotFoundError(error)).toBe(false);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isToolNotFoundError(error)).toBe(false);
    });
  });

  describe('createInternalError', () => {
    it('should create an error with the correct code and message', () => {
      const error = createInternalError('test error');
      expect(error.code).toBe(AgentBuilderErrorCode.internalError);
      expect(error.message).toBe('test error');
    });

    it('should include optional metadata', () => {
      const meta = { foo: 'bar' };
      const error = createInternalError('test error', meta);
      expect(error.meta).toEqual(meta);
    });

    it('should use empty object as default metadata', () => {
      const error = createInternalError('test error');
      expect(error.meta).toEqual({});
    });
  });

  describe('createToolNotFoundError', () => {
    it('should create an error with the correct code and default message', () => {
      const error = createToolNotFoundError({ toolId: 'test-tool' });
      expect(error.code).toBe(AgentBuilderErrorCode.toolNotFound);
      expect(error.message).toBe(`Tool test-tool not found`);
      expect(error.meta).toEqual({
        toolId: 'test-tool',
        statusCode: 404,
      });
    });

    it('should use custom message when provided', () => {
      const error = createToolNotFoundError({
        toolId: 'test-tool',
        customMessage: 'Custom error message',
      });
      expect(error.message).toBe('Custom error message');
      expect(error.meta).toEqual({
        toolId: 'test-tool',
        statusCode: 404,
      });
    });
  });

  describe('createAgentBuilderError', () => {
    it('should create an error with the correct code and message', () => {
      const error = createAgentBuilderError(AgentBuilderErrorCode.internalError, 'test error');
      expect(error.code).toBe(AgentBuilderErrorCode.internalError);
      expect(error.message).toBe('test error');
    });

    it('should include optional metadata', () => {
      const meta = { foo: 'bar' };
      const error = createAgentBuilderError(
        AgentBuilderErrorCode.internalError,
        'test error',
        meta
      );
      expect(error.meta).toEqual(meta);
    });

    it('should use empty object as default metadata', () => {
      const error = createAgentBuilderError(AgentBuilderErrorCode.internalError, 'test error');
      expect(error.meta).toEqual({});
    });
  });

  describe('isAgentNotFoundError', () => {
    it('should return true for an agent not found error', () => {
      const error = createAgentNotFoundError({
        agentId: 'test-agent',
      });
      expect(isAgentNotFoundError(error)).toBe(true);
    });

    it('should return false for an internal error', () => {
      const error = createInternalError('test error');
      expect(isAgentNotFoundError(error)).toBe(false);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isAgentNotFoundError(error)).toBe(false);
    });
  });

  describe('createAgentNotFoundError', () => {
    it('should create an error with the correct code and default message', () => {
      const error = createAgentNotFoundError({
        agentId: 'test-agent',
      });
      expect(error.code).toBe(AgentBuilderErrorCode.agentNotFound);
      expect(error.message).toBe(`Agent test-agent not found`);
      expect(error.meta).toEqual({
        agentId: 'test-agent',
        statusCode: 404,
      });
    });

    it('should use custom message when provided', () => {
      const error = createAgentNotFoundError({
        agentId: 'test-agent',
        customMessage: 'Custom error message',
      });
      expect(error.message).toBe('Custom error message');
      expect(error.meta).toEqual({
        agentId: 'test-agent',
        statusCode: 404,
      });
    });

    it('should include additional metadata when provided', () => {
      const meta = { foo: 'bar' };
      const error = createAgentNotFoundError({
        agentId: 'test-agent',
        meta,
      });
      expect(error.meta).toEqual({
        agentId: 'test-agent',
        statusCode: 404,
        foo: 'bar',
      });
    });
  });
});
