/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAgentPolicyAdvancedSettings,
  zodStringWithDurationValidation,
  zodStringWithYamlValidation,
} from './agent_policy_settings';

const AGENT_POLICY_ADVANCED_SETTINGS = getAgentPolicyAdvancedSettings();

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
    it('should accept valid YAML string', async () => {
      const result = await zodStringWithYamlValidation.safeParseAsync(
        'nested:\n  key1: value1\n  key2: value2'
      );
      expect(result.success).toBe(true);
    });

    it('should reject invalid YAML string', async () => {
      const result = await zodStringWithYamlValidation.safeParseAsync('invalidyaml: [unclosed');
      expect(result.success).toBe(false);
    });
  });

  describe('disable_policy_change_acks setting', () => {
    it('should include agent.features.disable_policy_change_acks.enabled in AGENT_POLICY_ADVANCED_SETTINGS', () => {
      const setting = AGENT_POLICY_ADVANCED_SETTINGS.find(
        (s) => s.name === 'agent.features.disable_policy_change_acks.enabled'
      );
      expect(setting).toBeDefined();
      expect(setting?.api_field.name).toBe('agent_features_disable_policy_change_acks_enabled');
    });

    it('should accept boolean values and default to false', () => {
      const setting = AGENT_POLICY_ADVANCED_SETTINGS.find(
        (s) => s.name === 'agent.features.disable_policy_change_acks.enabled'
      )!;
      expect(setting.schema.safeParse(true).success).toBe(true);
      expect(setting.schema.safeParse(false).success).toBe(true);
      expect(setting.schema.safeParse(undefined).success).toBe(true);
      expect(setting.schema.parse(undefined)).toBe(false);
    });
  });
});
