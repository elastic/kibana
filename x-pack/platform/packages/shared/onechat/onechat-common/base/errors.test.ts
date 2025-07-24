/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isOnechatError,
  createInternalError,
  createToolNotFoundError,
  isInternalError,
  isToolNotFoundError,
  OnechatErrorCode,
  createOnechatError,
  isAgentNotFoundError,
  createAgentNotFoundError,
  formatOnechatErrorMessage,
} from './errors';

describe('Onechat errors', () => {
  describe('isOnechatError', () => {
    it('should return true for a OnechatError instance', () => {
      const error = createInternalError('test error');
      expect(isOnechatError(error)).toBe(true);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isOnechatError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isOnechatError(null)).toBe(false);
      expect(isOnechatError(undefined)).toBe(false);
      expect(isOnechatError('string')).toBe(false);
      expect(isOnechatError({})).toBe(false);
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
      expect(error.code).toBe(OnechatErrorCode.internalError);
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
      expect(error.code).toBe(OnechatErrorCode.toolNotFound);
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

  describe('createOnechatError', () => {
    it('should create an error with the correct code and message', () => {
      const error = createOnechatError(OnechatErrorCode.internalError, 'test error');
      expect(error.code).toBe(OnechatErrorCode.internalError);
      expect(error.message).toBe('test error');
    });

    it('should include optional metadata', () => {
      const meta = { foo: 'bar' };
      const error = createOnechatError(OnechatErrorCode.internalError, 'test error', meta);
      expect(error.meta).toEqual(meta);
    });

    it('should use empty object as default metadata', () => {
      const error = createOnechatError(OnechatErrorCode.internalError, 'test error');
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
      expect(error.code).toBe(OnechatErrorCode.agentNotFound);
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

  describe('formatOnechatErrorMessage', () => {
    it('should format OnechatError instances correctly', () => {
      const internalError = createInternalError('Internal server error');
      expect(formatOnechatErrorMessage(internalError)).toBe('Internal server error');

      const toolNotFoundError = createToolNotFoundError({ toolId: 'missing-tool' });
      expect(formatOnechatErrorMessage(toolNotFoundError)).toBe('Tool missing-tool not found');

      const agentNotFoundError = createAgentNotFoundError({ agentId: 'missing-agent' });
      expect(formatOnechatErrorMessage(agentNotFoundError)).toBe('Agent missing-agent not found');
    });

    it('should format generic JavaScript errors correctly', () => {
      const jsError = new Error('Something went wrong');
      expect(formatOnechatErrorMessage(jsError)).toBe('Something went wrong');

      const typeError = new TypeError('Invalid type');
      expect(formatOnechatErrorMessage(typeError)).toBe('Invalid type');
    });

    it('should handle string inputs', () => {
      expect(formatOnechatErrorMessage('Simple error message')).toBe('Simple error message');
    });

    it('should handle falsy values', () => {
      expect(formatOnechatErrorMessage(null)).toBe('null');
      expect(formatOnechatErrorMessage(undefined)).toBe('undefined');
    });

    it('should handle HTTP response errors with body.message', () => {
      const httpError = createOnechatError(OnechatErrorCode.badRequest, 'test error', {
        statusCode: 400,
      });
      expect(formatOnechatErrorMessage(httpError)).toBe('test error');
    });
  });
});
