/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepIndexFromArrayItemPath } from './utils';

describe('streams DSL steps flyout utils', () => {
  describe('getStepIndexFromArrayItemPath()', () => {
    it('extracts a step index from an ArrayItem path', () => {
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[0]')).toBe(0);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[12]')).toBe(12);
    });

    it('returns -1 for non-step paths', () => {
      expect(getStepIndexFromArrayItemPath('')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('foo')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[1].afterValue')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[]')).toBe(-1);
    });
  });
});
