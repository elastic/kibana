/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { updateFormErrors } from './auto_follow_pattern_form';
import type { AutoFollowPatternValidationErrors } from '../services/auto_follow_pattern_validators';

vi.mock('../services/auto_follow_pattern_validators', () => {
      const mocked = {
      validateAutoFollowPattern: vi.fn(),
      validateLeaderIndexPattern: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('<AutoFollowPatternForm state update', () => {
  describe('updateFormErrors()', () => {
    it('should merge errors with existing fieldsErrors', () => {
      const errors: AutoFollowPatternValidationErrors = { name: 'Some error' };
      const existingErrors: AutoFollowPatternValidationErrors = { leaderIndexPatterns: null };
      const output = updateFormErrors(errors, existingErrors);
      expect(output).toMatchSnapshot();
    });
  });
});
