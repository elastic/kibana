/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateId } from './helper_functions';

describe('helper_functions', () => {
  describe('generateId', () => {
    it('should return a 12-character string', () => {
      const id = generateId();
      expect(id).toHaveLength(12);
    });

    it('should return only alphanumeric characters', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique IDs on multiple calls', () => {
      const ids = new Set<string>();
      const numIterations = 100;

      for (let i = 0; i < numIterations; i++) {
        ids.add(generateId());
      }

      // All generated IDs should be unique
      expect(ids.size).toBe(numIterations);
    });

    it('should not contain hyphens', () => {
      const id = generateId();
      expect(id).not.toContain('-');
    });
  });
});
