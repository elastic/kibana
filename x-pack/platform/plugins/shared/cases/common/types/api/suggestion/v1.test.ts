/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestionRequestRt } from './v1';

describe('Suggestion Schemas and Types', () => {
  describe('suggestionRequestRt', () => {
    it('should validate a valid request', () => {
      const validRequest = {
        owners: ['observability', 'security'],
        context: {
          'service.name': 'my-service',
          timeRange: {
            from: '2023-01-01T00:00:00Z',
            to: '2023-01-02T00:00:00Z',
          },
        },
      };

      expect(() => suggestionRequestRt.parse(validRequest)).not.toThrow();
    });

    it('should throw an error for invalid owners', () => {
      const invalidRequest = {
        owners: ['invalid-owner'], // Invalid owner
        context: {
          'service.name': 'my-service',
        },
      };

      expect(() => suggestionRequestRt.parse(invalidRequest)).toThrow();
    });

    it('should allow optional context fields to be omitted', () => {
      const validRequest = {
        owners: ['stack'],
        context: {},
      };

      expect(() => suggestionRequestRt.parse(validRequest)).not.toThrow();
    });
  });
});
