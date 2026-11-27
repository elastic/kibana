/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServiceError } from './utils';

describe('Workflows Utils', () => {
  describe('createServiceError', () => {
    it('should create error with HTTP error message', () => {
      const httpError = {
        name: 'Error',
        response: {
          data: {
            message: 'API Error: Invalid request',
          },
        },
        message: 'Request failed',
      } as Error;

      const result = createServiceError(httpError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: API Error: Invalid request');
    });

    it('should use HTTP error message when response data has no message', () => {
      const httpError = {
        name: 'Error',
        response: {
          data: {},
        },
        message: 'Network error',
      } as Error;

      const result = createServiceError(httpError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Network error');
    });

    it('should handle HTTP error without response data', () => {
      const httpError = {
        name: 'Error',
        message: 'Connection timeout',
      } as Error;

      const result = createServiceError(httpError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Connection timeout');
    });

    it('should handle regular errors', () => {
      const regularError = new Error('Something went wrong');

      const result = createServiceError(regularError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Something went wrong');
    });

    it('should handle errors without message', () => {
      const errorWithoutMessage = {} as Error;

      const result = createServiceError(errorWithoutMessage, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: undefined');
    });
  });
});
