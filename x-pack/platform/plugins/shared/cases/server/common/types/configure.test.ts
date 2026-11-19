/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeOrThrowZod } from '../runtime_types';
import { ConfigurationPartialAttributesSchema } from './configure';

describe('Configuration', () => {
  describe('ConfigurationPartialAttributesSchema', () => {
    it('strips excess fields from the result', () => {
      const res = decodeOrThrowZod(ConfigurationPartialAttributesSchema)({
        bananas: 'yes',
        created_at: '123',
      });

      expect(res).toStrictEqual({
        created_at: '123',
      });
    });

    it('should not throw even with an empty object', () => {
      expect(() => decodeOrThrowZod(ConfigurationPartialAttributesSchema)({})).not.toThrow();
    });
  });
});
