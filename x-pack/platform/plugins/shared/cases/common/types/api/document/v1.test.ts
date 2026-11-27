/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentResponseSchema } from './v1';

describe('Documents', () => {
  describe('DocumentResponseSchema', () => {
    it('has expected attributes in request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const result = DocumentResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('multiple attributes in request', () => {
      const defaultRequest = [
        { id: '1', index: '2', attached_at: '3' },
        { id: '2', index: '3', attached_at: '4' },
      ];
      const result = DocumentResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const result = DocumentResponseSchema.safeParse([{ ...defaultRequest[0], foo: 'bar' }]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
