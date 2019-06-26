/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { validateAutoFollowPattern } from './auto_follow_pattern_validators';

jest.mock('ui/index_patterns/index_patterns.js', () => ({
  IndexPatterns: jest.fn(),
}));

jest.mock('ui/index_patterns/index_patterns_api_client.js', () => ({
  IndexPatternsApiClient: jest.fn(),
}));

describe('Auto-follow pattern validators', () => {
  describe('validateAutoFollowPattern()', () => {
    it('returns empty object when autoFollowPattern is undefined', () => {
      const errors = validateAutoFollowPattern();
      expect(errors).toMatchSnapshot();
    });

    it('should validate all props from auto-follow patten', () => {
      const autoFollowPattern = {
        name: '_wrong-name',
        leaderIndexPatterns: ['wrong\pattern'],
        followIndexPatternPrefix: 'pre?fix_',
        followIndexPatternSuffix: '_suf?fix',
        otherProp: 'foo'
      };
      const errors = validateAutoFollowPattern(autoFollowPattern);
      expect(errors).toMatchSnapshot();
    });
  });
});
