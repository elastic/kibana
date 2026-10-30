/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { limitedJsonObjectSchema } from '.';

const parseErrors = (schema: z.ZodTypeAny, value: unknown): string[] => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};

describe('schema_zod', () => {
  describe('limitedJsonObjectSchema', () => {
    const schema = limitedJsonObjectSchema({ fieldName: 'data', max: 1000, maxDepth: 3 });
    const depthError = 'The data field is nested too deeply. The maximum depth is 3.';

    // Builds an object nested `depth` levels deep, counting the top-level object as 1.
    const nestedObject = (depth: number): Record<string, unknown> => {
      let value: Record<string, unknown> = { leaf: true };
      for (let level = 1; level < depth; level++) {
        value = { child: value };
      }
      return value;
    };

    it('accepts an object at the maximum depth', () => {
      expect(parseErrors(schema, nestedObject(3))).toEqual([]);
    });

    it('rejects an object deeper than the maximum depth', () => {
      expect(parseErrors(schema, nestedObject(4))).toEqual([depthError]);
    });

    it('counts arrays as levels', () => {
      expect(parseErrors(schema, { a: [[1]] })).toEqual([]);
      expect(parseErrors(schema, { a: [[[1]]] })).toEqual([depthError]);
    });

    it('rejects very deep input without overflowing the stack', () => {
      const depth = 100_000;
      const value = JSON.parse(`{"a":${'['.repeat(depth)}${']'.repeat(depth)}}`);

      expect(parseErrors(schema, value)).toEqual([depthError]);
    });

    it('still rejects input over the serialized length', () => {
      expect(parseErrors(schema, { a: 'x'.repeat(999), b: 'y' })).toEqual([
        'The data field is too large. The maximum serialized length is 1000.',
      ]);
    });

    it('rejects a top-level array as the wrong type, not as too deep', () => {
      const errors = parseErrors(schema, [1]);

      expect(errors).toHaveLength(1);
      expect(errors).not.toContain(depthError);
    });
  });
});
