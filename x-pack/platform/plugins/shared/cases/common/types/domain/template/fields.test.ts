/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RadioGroupFieldSchema } from './fields';

const baseField = {
  name: 'env',
  control: 'RADIO_GROUP' as const,
  type: 'keyword' as const,
};

describe('RadioGroupFieldSchema', () => {
  describe('metadata.options validation', () => {
    it('accepts exactly 2 options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['a', 'b'] },
      });
      expect(result.success).toBe(true);
    });

    it('accepts up to 20 options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: Array.from({ length: 20 }, (_, i) => `opt${i}`) },
      });
      expect(result.success).toBe(true);
    });

    it('rejects fewer than 2 options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['only-one'] },
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 20 options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: Array.from({ length: 21 }, (_, i) => `opt${i}`) },
      });
      expect(result.success).toBe(false);
    });

    it('rejects duplicate options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['a', 'a', 'b'] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('metadata.default validation', () => {
    it('accepts a valid default that is one of the options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['staging', 'production'], default: 'staging' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts when default is absent', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['staging', 'production'] },
      });
      expect(result.success).toBe(true);
    });

    it('rejects a default that is not one of the options', () => {
      const result = RadioGroupFieldSchema.safeParse({
        ...baseField,
        metadata: { options: ['staging', 'production'], default: 'development' },
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        'Default value development is not a valid option.'
      );
    });
  });
});
