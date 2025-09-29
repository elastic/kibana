/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasChangedRetention } from './utils';

describe('telemetry utils', () => {
  describe('hasChangedRetention', () => {
    it('returns false for undefined lifecycle', () => {
      expect(hasChangedRetention(undefined)).toBe(false);
    });

    it('returns false for inherit lifecycle (default retention)', () => {
      expect(hasChangedRetention({ inherit: {} })).toBe(false);
    });

    it('returns true for DSL lifecycle with custom retention', () => {
      expect(hasChangedRetention({ dsl: { data_retention: '30d' } })).toBe(true);
    });

    it('returns true for DSL lifecycle with forever retention (empty DSL)', () => {
      expect(hasChangedRetention({ dsl: {} })).toBe(true);
    });
  });
});
