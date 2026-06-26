/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isBuiltinSkillAutoIncludedForElasticCapabilities,
  isElasticCapabilitiesExcludedBuiltinSkill,
} from './elastic_capabilities_excluded_builtin_skills';

describe('elastic capabilities excluded builtin skills', () => {
  it('does not exclude the ML anomaly detection skill from auto-include', () => {
    expect(isElasticCapabilitiesExcludedBuiltinSkill('ml.anomaly-detection')).toBe(false);
    expect(isElasticCapabilitiesExcludedBuiltinSkill('observability.rca')).toBe(false);
  });

  it('auto-includes readonly builtins when elastic capabilities are enabled', () => {
    expect(
      isBuiltinSkillAutoIncludedForElasticCapabilities(
        { id: 'ml.anomaly-detection', readonly: true },
        true
      )
    ).toBe(true);
    expect(
      isBuiltinSkillAutoIncludedForElasticCapabilities(
        { id: 'observability.rca', readonly: true },
        true
      )
    ).toBe(true);
  });
});
