/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  zodStringWithDurationValidation,
  zodStringWithYamlValidation,
} from './agent_policy_settings';

describe('agent_policy_settings', () => {
  describe('zodStringWithDurationValidation', () => {
    it('accepts valid duration strings', () => {
      const validDurations = ['30s', '5m', '2h', '1h', '15m', '45s'];
      validDurations.forEach((duration) => {
        const result = zodStringWithDurationValidation.safeParse(duration);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid duration strings', () => {
      const invalidDurations = ['30', '5x', '2hours', 'abc', '10d'];
      invalidDurations.forEach((duration) => {
        const result = zodStringWithDurationValidation.safeParse(duration);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('zodStringWithYamlValidation', () => {
    it('should accept valid YAML string', () => {
      const result = zodStringWithYamlValidation.safeParse(
        'nested:\n  key1: value1\n  key2: value2'
      );
      expect(result.success).toBe(true);
    });

    it('should reject invalid YAML string', () => {
      const result = zodStringWithYamlValidation.safeParse(
        'nested:\n  key1: value1\n  key1: value2'
      );
      expect(result.success).toBe(false);
    });
  });
});
