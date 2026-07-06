/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertConditionSummaryState, isCommittedQueryValid } from './committed_query_validation';

describe('committed query validation', () => {
  describe('isCommittedQueryValid', () => {
    it('returns false when query is not committed', () => {
      expect(
        isCommittedQueryValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          'alert',
          false
        )
      ).toBe(false);
    });

    it('returns true for a valid composed alert query', () => {
      expect(
        isCommittedQueryValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          'alert',
          true
        )
      ).toBe(true);
    });

    it('returns false for a base-only alert persisted as standalone', () => {
      expect(
        isCommittedQueryValid(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'alert',
          true
        )
      ).toBe(false);
    });

    it('returns true for a signal rule with a non-empty standalone query', () => {
      expect(
        isCommittedQueryValid(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'signal',
          true
        )
      ).toBe(true);
    });

    it('returns false for a signal rule with an empty query', () => {
      expect(
        isCommittedQueryValid(
          { format: 'composed', base: '', breach: { segment: '' } },
          'signal',
          true
        )
      ).toBe(false);
    });

    it('matches submit and step-navigation semantics for alert rules', () => {
      const invalidQuery = {
        format: 'composed' as const,
        base: 'FROM logs-*',
        breach: { segment: '' },
      };
      expect(isCommittedQueryValid(invalidQuery, 'alert', true)).toBe(false);
    });

    it('matches submit and step-navigation semantics for signal rules', () => {
      expect(
        isCommittedQueryValid({ format: 'standalone', breach: { query: '' } }, 'signal', true)
      ).toBe(false);
    });
  });

  describe('getAlertConditionSummaryState', () => {
    it('returns success for a complete composed alert query', () => {
      expect(
        getAlertConditionSummaryState(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          true
        )
      ).toBe('success');
    });

    it('returns no_alert_condition when the breach segment is missing', () => {
      expect(
        getAlertConditionSummaryState(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
          true
        )
      ).toBe('no_alert_condition');
    });
  });
});
