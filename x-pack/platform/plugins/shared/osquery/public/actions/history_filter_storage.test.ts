/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { saveHistoryFilters, getHistoryFilters } from './history_filter_storage';

describe('history_filter_storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('saveHistoryFilters / getHistoryFilters', () => {
    it('should round-trip a query string', () => {
      saveHistoryFilters('?q=uptime&sources=live');
      expect(getHistoryFilters()).toBe('?q=uptime&sources=live');
    });

    it('should return empty string when nothing is stored', () => {
      expect(getHistoryFilters()).toBe('');
    });

    it('should store empty string for default filters', () => {
      saveHistoryFilters('');
      expect(getHistoryFilters()).toBe('');
    });

    it('should overwrite previous value', () => {
      saveHistoryFilters('?q=first');
      saveHistoryFilters('?q=second');
      expect(getHistoryFilters()).toBe('?q=second');
    });
  });

  describe('graceful degradation', () => {
    it('should not throw when sessionStorage.setItem throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveHistoryFilters('?q=test')).not.toThrow();

      jest.restoreAllMocks();
    });

    it('should return empty string when sessionStorage.getItem throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      expect(getHistoryFilters()).toBe('');

      jest.restoreAllMocks();
    });
  });
});
