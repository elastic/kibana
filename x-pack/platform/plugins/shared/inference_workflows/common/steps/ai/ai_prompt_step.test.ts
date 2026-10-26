/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE,
  ConfigSchema,
  normalizeOptionalConnectorParam,
} from './ai_prompt_step';

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

    it('accepts a feature list next to connector-id', () => {
      expect(
        ConfigSchema.safeParse({
          'connector-id': 'my-connector',
          'connector-id-by-feature': ['alertzero_template_models', 'my_feature'],
        }).success
      ).toBe(true);
    });
  });

  describe('ConfigSchema telemetry fields', () => {
    it('accepts a step without any telemetry field, so existing workflows keep validating', () => {
      expect(ConfigSchema.safeParse({ 'connector-id': 'my-connector' }).success).toBe(true);
    });

    it('accepts every telemetry field together with max-step-size', () => {
      expect(
        ConfigSchema.safeParse({
          'connector-id': 'my-connector',
          'max-step-size': '10mb',
          'plugin-id': 'my_feature',
          'aggregate-by': 'my_parent',
          'product-solution': 'security',
          'product-feature': 'alert_triage',
        }).success
      ).toBe(true);
    });

    it('rejects aggregate-by without plugin-id, since a parent rollup needs a feature to group', () => {
      const result = ConfigSchema.safeParse({ 'aggregate-by': 'my_parent' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toEqual(
        expect.objectContaining({
          message: AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE,
          path: ['aggregate-by'],
        })
      );
    });

    it('accepts a blank aggregate-by without plugin-id, so a templated field can render empty', () => {
      expect(ConfigSchema.safeParse({ 'aggregate-by': '', 'plugin-id': '' }).success).toBe(true);
    });
  });
});
