/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonRecoverableError } from './task_manager_service';

describe('isNonRecoverableError', () => {
  describe('status code detection', () => {
    it('should return true for 404 statusCode', () => {
      const error = Object.assign(new Error('Not found'), { statusCode: 404 });
      expect(isNonRecoverableError(error)).toBe(true);
    });

    it('should return true for 400 statusCode', () => {
      const error = Object.assign(new Error('Bad request'), { statusCode: 400 });
      expect(isNonRecoverableError(error)).toBe(true);
    });

    it('should return true for 403 statusCode', () => {
      const error = Object.assign(new Error('Forbidden'), { statusCode: 403 });
      expect(isNonRecoverableError(error)).toBe(true);
    });

    it('should return true for 404 in meta.status', () => {
      const error = Object.assign(new Error('Not found'), { meta: { status: 404 } });
      expect(isNonRecoverableError(error)).toBe(true);
    });

    it('should return true for 400 in output.statusCode', () => {
      const error = Object.assign(new Error('Bad request'), { output: { statusCode: 400 } });
      expect(isNonRecoverableError(error)).toBe(true);
    });

    it('should return false for 500 statusCode (transient)', () => {
      const error = Object.assign(new Error('Internal server error'), { statusCode: 500 });
      expect(isNonRecoverableError(error)).toBe(false);
    });

    it('should return false for 502 statusCode (transient)', () => {
      const error = Object.assign(new Error('Bad gateway'), { statusCode: 502 });
      expect(isNonRecoverableError(error)).toBe(false);
    });

    it('should return false for 429 statusCode (rate limit, retryable)', () => {
      const error = Object.assign(new Error('Too many requests'), { statusCode: 429 });
      expect(isNonRecoverableError(error)).toBe(false);
    });
  });

  describe('message pattern detection', () => {
    it('should return true for "not found" message', () => {
      expect(isNonRecoverableError(new Error('Resource not found'))).toBe(true);
    });

    it('should return true for "No connector found" message', () => {
      expect(isNonRecoverableError(new Error("No connector found for id 'bedrock-45'"))).toBe(true);
    });

    it('should return true for "Saved object ... not found" message', () => {
      expect(isNonRecoverableError(new Error('Saved object [action/bedrock-45] not found'))).toBe(
        true
      );
    });

    it('should return true for case-insensitive "Not Found" message', () => {
      expect(isNonRecoverableError(new Error('NOT FOUND'))).toBe(true);
    });

    it('should return false for generic transient error messages', () => {
      expect(isNonRecoverableError(new Error('Connection timeout'))).toBe(false);
    });

    it('should return false for network errors', () => {
      expect(isNonRecoverableError(new Error('ECONNREFUSED'))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error objects', () => {
      expect(isNonRecoverableError({ statusCode: 404 })).toBe(true);
    });

    it('should handle string errors via message matching', () => {
      expect(isNonRecoverableError('Saved object [action/test] not found')).toBe(true);
    });

    it('should return false for null', () => {
      expect(isNonRecoverableError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNonRecoverableError(undefined)).toBe(false);
    });

    it('should return false for errors without status code or matching message', () => {
      expect(isNonRecoverableError(new Error('Something went wrong'))).toBe(false);
    });
  });
});
