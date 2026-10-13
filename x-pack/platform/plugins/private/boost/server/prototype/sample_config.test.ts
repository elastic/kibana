/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_PROFILES } from '../../common/presets';
import {
  getBoostRangeError,
  getIndexPatternError,
  getIndexPatternsError,
  getMaxAgeError,
  getProfileNameError,
  getRuleNameError,
  getRulePriorityError,
  parseMaxAge,
} from '../../common/validation';
import { SAMPLE_PROFILES, SAMPLE_RULES } from './sample_config';

describe('sample config', () => {
  it('only includes valid profiles', () => {
    SAMPLE_PROFILES.forEach((profile) => {
      expect(getProfileNameError(profile.name)).toBeUndefined();

      if (profile.type === 'indices') {
        expect(getBoostRangeError(profile.min_boost, profile.max_boost)).toBeUndefined();
        return;
      }

      const { recent, standard, background } = profile;
      [recent, standard, background].forEach(({ min_boost: min, max_boost: max }) =>
        expect(getBoostRangeError(min, max)).toBeUndefined()
      );
      const recentMaxAge = parseMaxAge(recent.max_age);
      expect(getMaxAgeError(recentMaxAge)).toBeUndefined();
      expect(getMaxAgeError(parseMaxAge(standard.max_age), recentMaxAge)).toBeUndefined();
    });
  });

  it('only includes valid rules that reference known profiles', () => {
    const profileNames = [...BUILTIN_PROFILES, ...SAMPLE_PROFILES].map(({ name }) => name);

    SAMPLE_RULES.forEach((rule) => {
      expect(getRuleNameError(rule.name)).toBeUndefined();
      expect(getIndexPatternsError(rule.index_patterns)).toBeUndefined();
      rule.index_patterns.forEach((pattern) =>
        expect(getIndexPatternError(pattern)).toBeUndefined()
      );
      expect(getRulePriorityError(rule.priority)).toBeUndefined();
      expect(profileNames).toContain(rule.boost_profile);
    });
  });
});
