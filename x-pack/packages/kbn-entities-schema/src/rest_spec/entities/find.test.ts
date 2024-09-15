/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchAfterSchema } from './find';
import rison from '@kbn/rison';

describe('FindEntitiesResponse Schema', () => {
  describe('searchAfterSchema', () => {
    it('should parse from rison.encode to schema', () => {
      const input = rison.encode(['example', 123]);
      const result = searchAfterSchema.safeParse(input);
      expect(result).toHaveProperty('success', true);
      expect(result.data).toEqual(['example', 123]);
    });
    it('should work with regular arrays', () => {
      const input = ['example', 123];
      const result = searchAfterSchema.safeParse(input);
      expect(result).toHaveProperty('success', true);
      expect(result.data).toEqual(['example', 123]);
    });
  });
});
