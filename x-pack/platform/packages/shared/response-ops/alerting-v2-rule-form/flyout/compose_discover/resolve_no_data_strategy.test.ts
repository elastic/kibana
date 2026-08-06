/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveNoDataStrategyForQuery } from './resolve_no_data_strategy';

describe('resolveNoDataStrategyForQuery', () => {
  describe('standalone', () => {
    it('always returns none', () => {
      expect(resolveNoDataStrategyForQuery(undefined, 'standalone')).toBe('none');
      expect(resolveNoDataStrategyForQuery('none', 'standalone')).toBe('none');
      expect(resolveNoDataStrategyForQuery('recover', 'standalone')).toBe('none');
      expect(resolveNoDataStrategyForQuery('last_known_status', 'standalone')).toBe('none');
    });
  });

  describe('composed', () => {
    it('preserves valid current strategies', () => {
      expect(resolveNoDataStrategyForQuery('none', 'composed')).toBe('none');
      expect(resolveNoDataStrategyForQuery('recover', 'composed')).toBe('recover');
      expect(resolveNoDataStrategyForQuery('last_known_status', 'composed')).toBe(
        'last_known_status'
      );
    });

    it('defaults to last_known_status when missing or invalid', () => {
      expect(resolveNoDataStrategyForQuery(undefined, 'composed')).toBe('last_known_status');
      expect(resolveNoDataStrategyForQuery('emit', 'composed')).toBe('last_known_status');
    });
  });
});
