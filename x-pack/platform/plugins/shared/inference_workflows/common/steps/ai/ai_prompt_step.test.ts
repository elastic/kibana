/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigSchema, normalizeOptionalConnectorParam } from './ai_prompt_step';

describe('ai_prompt_step common', () => {
  describe('normalizeOptionalConnectorParam', () => {
    it.each([undefined, '', '   '])('treats %j as unset', (value) => {
      expect(normalizeOptionalConnectorParam(value)).toBeUndefined();
    });

    it('trims a real value', () => {
      expect(normalizeOptionalConnectorParam('  my-connector ')).toBe('my-connector');
    });
  });

  describe('ConfigSchema connector fields', () => {
    it('rejects two real connector values, which would make the choice ambiguous', () => {
      const result = ConfigSchema.safeParse({
        'connector-id': 'my-connector',
        'connector-id-by-feature': 'my_feature',
      });
      expect(result.success).toBe(false);
    });

    it.each(['', '   '])(
      'accepts a blank connector-id (%j) next to a feature, so one step can list both fields',
      (blank) => {
        expect(
          ConfigSchema.safeParse({ 'connector-id': blank, 'connector-id-by-feature': 'my_feature' })
            .success
        ).toBe(true);
      }
    );

    it.each(['', '   '])('accepts a blank feature (%j) next to a connector-id', (blank) => {
      expect(
        ConfigSchema.safeParse({ 'connector-id': 'my-connector', 'connector-id-by-feature': blank })
          .success
      ).toBe(true);
    });

    it('accepts both fields blank', () => {
      expect(
        ConfigSchema.safeParse({ 'connector-id': '', 'connector-id-by-feature': '' }).success
      ).toBe(true);
    });
  });
});
