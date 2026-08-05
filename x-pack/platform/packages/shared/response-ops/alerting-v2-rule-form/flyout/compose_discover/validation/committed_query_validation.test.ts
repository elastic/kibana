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
        isCommittedQueryValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          false
        )
      ).toBe(false);
    });

    it('returns true for a valid composed alert query', () => {
      expect(
        isCommittedQueryValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          true
        )
      ).toBe(true);
    });

    it('returns true for a standalone alert query without an explicit alert condition (conditionless rule)', () => {
      expect(
        isCommittedQueryValid({ format: 'standalone', breach: { query: 'FROM logs-*' } }, true)
      ).toBe(true);
    });

    it('returns true for a signal rule with a non-empty standalone query', () => {
      expect(
        isCommittedQueryValid({ format: 'standalone', breach: { query: 'FROM logs-*' } }, true)
      ).toBe(true);
    });

    it('returns false for a signal rule with an empty query', () => {
      expect(
        isCommittedQueryValid({ format: 'composed', base: '', breach: { segment: '' } }, true)
      ).toBe(false);
    });

    it('returns true for a signal rule with a composed query that has a base (kind-agnostic)', () => {
      expect(
        isCommittedQueryValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          true
        )
      ).toBe(true);
    });
  });

  describe('validateCommittedQuery', () => {
    it('returns true for a valid composed alert query', () => {
      expect(
        validateCommittedQuery(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          true
        )
      ).toBe(true);
    });

    it('returns true when the alert query has no alert condition (conditionless rule)', () => {
      const result = validateCommittedQuery(
        { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
        true
      );
      expect(result).toBe(true);
    });

    it('returns an error string when the query is not committed', () => {
      const result = validateCommittedQuery(
        { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
        false
      );
      expect(typeof result).toBe('string');
    });

    it('returns an error string for an empty signal query', () => {
      const result = validateCommittedQuery({ format: 'standalone', breach: { query: '' } }, true);
      expect(typeof result).toBe('string');
    });

    it('returns an error string when a composed alert query has no base or segment', () => {
      const result = validateCommittedQuery(
        { format: 'composed', base: '', breach: { segment: '' } },
        true
      );
      expect(typeof result).toBe('string');
      expect(result).toMatch(/query/i);
    });

    it('returns true for a standalone alert query with no WHERE clause (conditionless rule)', () => {
      const result = validateCommittedQuery(
        { format: 'standalone', breach: { query: 'FROM logs-*' } },
        true
      );
      expect(result).toBe(true);
    });
  });
});
