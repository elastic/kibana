/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocumentResponseRt } from './v1';
import { DocumentResponseSchema } from '../../api_zod/document/v1';

describe('Documents', () => {
  describe('DocumentResponseRt', () => {
    it('has expected attributes in request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];

      const query = DocumentResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('multiple attributes in request', () => {
      const defaultRequest = [
        { id: '1', index: '2', attached_at: '3' },
        { id: '2', index: '3', attached_at: '4' },
      ];
      const query = DocumentResponseRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const query = DocumentResponseRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const result = DocumentResponseSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const defaultRequest = [{ id: '1', index: '2', attached_at: '3' }];
      const result = DocumentResponseSchema.safeParse([{ ...defaultRequest[0], foo: 'bar' }]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
