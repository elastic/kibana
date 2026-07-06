/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAlertConditionNextBlocked,
  isAlertConditionStepValid,
  isQueryValidForSubmit,
} from './committed_query_validation';

describe('committed query validation', () => {
  describe('isAlertConditionStepValid', () => {
    it('returns false when query is not committed', () => {
      expect(
        isAlertConditionStepValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          'alert',
          false
        )
      ).toBe(false);
    });

    it('returns true for a valid composed alert query', () => {
      expect(
        isAlertConditionStepValid(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          'alert',
          true
        )
      ).toBe(true);
    });

    it('returns false for a base-only alert persisted as standalone', () => {
      expect(
        isAlertConditionStepValid(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'alert',
          true
        )
      ).toBe(false);
    });

    it('returns true for a signal rule with a non-empty standalone query', () => {
      expect(
        isAlertConditionStepValid(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'signal',
          true
        )
      ).toBe(true);
    });

    it('returns false for a signal rule with an empty query', () => {
      expect(
        isAlertConditionStepValid(
          { format: 'composed', base: '', breach: { segment: '' } },
          'signal',
          true
        )
      ).toBe(false);
    });
  });

  describe('isAlertConditionNextBlocked', () => {
    it('blocks alert rules without a valid alert condition', () => {
      expect(
        isAlertConditionNextBlocked(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '' } },
          true
        )
      ).toBe(true);
    });

    it('does not block when the composed alert query is complete', () => {
      expect(
        isAlertConditionNextBlocked(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          true
        )
      ).toBe(false);
    });
  });

  describe('isQueryValidForSubmit', () => {
    it('requires a non-empty breach query for signal rules', () => {
      expect(
        isQueryValidForSubmit(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'signal',
          true
        )
      ).toBe(true);
      expect(
        isQueryValidForSubmit({ format: 'standalone', breach: { query: '' } }, 'signal', true)
      ).toBe(false);
    });

    it('requires a successful alert split for alert rules', () => {
      expect(
        isQueryValidForSubmit(
          { format: 'composed', base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } },
          'alert',
          true
        )
      ).toBe(true);
      expect(
        isQueryValidForSubmit(
          { format: 'standalone', breach: { query: 'FROM logs-*' } },
          'alert',
          true
        )
      ).toBe(false);
    });
  });
});
