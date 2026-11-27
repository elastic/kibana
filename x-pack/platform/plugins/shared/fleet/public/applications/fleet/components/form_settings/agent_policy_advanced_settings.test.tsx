/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentPolicyAdvancedSettings } from '../../../../../common/settings';

import { getAgentPolicyAdvancedSettingsConfig } from './agent_policy_advanced_settings';

describe('getAgentPolicyAdvancedSettingsConfig', () => {
  it('provides a description for every agent policy advanced setting', () => {
    const settings = getAgentPolicyAdvancedSettingsConfig();

    expect(settings.map(({ name }) => name)).toEqual(
      getAgentPolicyAdvancedSettings().map(({ name }) => name)
    );
    for (const setting of settings) {
      expect(typeof setting.description).toBe('function');
    }
  });
});
