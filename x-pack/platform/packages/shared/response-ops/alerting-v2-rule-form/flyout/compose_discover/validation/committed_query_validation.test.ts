/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isCommittedQueryValid, validateCommittedQuery } from './committed_query_validation';

describe('committed query validation', () => {
  describe('isCommittedQueryValid', () => {
    it('returns false when query is not committed', () => {
      expect(
        isCommittedQueryValid({ base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } }, false)
      ).toBe(false);
    });

    it('returns true for a query with a base and a breach segment', () => {
      expect(
        isCommittedQueryValid({ base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } }, true)
      ).toBe(true);
    });

    it('returns true for a query without a breach segment (conditionless rule)', () => {
      expect(isCommittedQueryValid({ base: 'FROM logs-*', breach: { segment: '' } }, true)).toBe(
        true
      );
    });

    it('returns false for an empty query', () => {
      expect(isCommittedQueryValid({ base: '', breach: { segment: '' } }, true)).toBe(false);
    });
  });

  describe('validateCommittedQuery', () => {
    it('returns true for a query with a base and a breach segment', () => {
      expect(
        validateCommittedQuery({ base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } }, true)
      ).toBe(true);
    });

    it('returns true when the query has no breach segment (conditionless rule)', () => {
      expect(validateCommittedQuery({ base: 'FROM logs-*', breach: { segment: '' } }, true)).toBe(
        true
      );
    });

    it('returns an error string when the query is not committed', () => {
      const result = validateCommittedQuery(
        { base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
        false
      );
      expect(typeof result).toBe('string');
    });

    it('returns an error string when the base is empty', () => {
      const result = validateCommittedQuery({ base: '', breach: { segment: '' } }, true);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/query/i);
    });

    it('returns an error string when only a breach segment is defined', () => {
      const result = validateCommittedQuery(
        { base: '', breach: { segment: '| WHERE x > 1' } },
        true
      );
      expect(typeof result).toBe('string');
    });
  });
});
