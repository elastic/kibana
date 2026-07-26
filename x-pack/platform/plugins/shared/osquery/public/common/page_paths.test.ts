/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters } from './page_paths';

describe('pagePathGetters', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('history', () => {
    it('returns bare /history when no persisted filters exist', () => {
      expect(pagePathGetters.history()).toBe('/history');
    });

    it('appends persisted filters from sessionStorage', () => {
      sessionStorage.setItem('osquery:historyFilters', '?q=uptime&sources=live');
      expect(pagePathGetters.history()).toBe('/history?q=uptime&sources=live');
    });

    it('returns bare /history when persisted filters are empty string', () => {
      sessionStorage.setItem('osquery:historyFilters', '');
      expect(pagePathGetters.history()).toBe('/history');
    });
  });
});
