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
} from './errors';
import { toSerializedToolIdentifier } from './tools';

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
      const error = createToolNotFoundError({ toolId: toSerializedToolIdentifier('test-tool') });
      expect(isInternalError(error)).toBe(false);
    });

    it('should return false for a regular Error', () => {
      const error = new Error('test error');
      expect(isInternalError(error)).toBe(false);
    });
  });

  describe('isToolNotFoundError', () => {
    it('should return true for a tool not found error', () => {
      const error = createToolNotFoundError({ toolId: toSerializedToolIdentifier('test-tool') });
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
      const error = createToolNotFoundError({ toolId: toSerializedToolIdentifier('test-tool') });
      expect(error.code).toBe(OnechatErrorCode.toolNotFound);
      expect(error.message).toBe(`Tool ${toSerializedToolIdentifier('test-tool')} not found`);
      expect(error.meta).toEqual({
        toolId: toSerializedToolIdentifier('test-tool'),
        statusCode: 404,
      });
    });

    it('should use custom message when provided', () => {
      const error = createToolNotFoundError({
        toolId: toSerializedToolIdentifier('test-tool'),
        customMessage: 'Custom error message',
      });
      expect(error.message).toBe('Custom error message');
      expect(error.meta).toEqual({
        toolId: toSerializedToolIdentifier('test-tool'),
        statusCode: 404,
      });
    });
  });
});
