/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestionContextRt } from './v1';

describe('Suggestion Schemas and Types', () => {
  describe('suggestionContextRt', () => {
    it('should validate a valid context', () => {
      const validContext = {
        spaceId: 'default',
        'service.name': ['my-service'],
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        },
      };

      expect(() => suggestionContextRt.decode(validContext)).not.toThrow();
    });

    it('should allow optional fields to be omitted', () => {
      const validContext = {
        spaceId: 'default',
      };
      expect(() => suggestionContextRt.decode(validContext)).not.toThrow();
    });

    it('should throw an error for invalid fields', () => {
      const invalidContext = {
        spaceId: 123, // Invalid type
        'service.name': 123, // Invalid type
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: 123, // Invalid type
        },
      };

      expect(suggestionContextRt.decode(invalidContext)).toEqual({
        _tag: 'Left',
        left: expect.any(Array),
      });
    });
  });
});
