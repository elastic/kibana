/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { EMPTY_VALUE, formatAlertDelay, formatRecoveryDelay } from './rule_display';

type StateTransition = RuleAttachmentData['state_transition'];

describe('formatAlertDelay', () => {
  it('returns the empty value when no pending threshold is configured', () => {
    expect(formatAlertDelay(undefined)).toBe(EMPTY_VALUE);
  });

  it('describes a pending count of zero as immediate', () => {
    expect(formatAlertDelay({ pending: { count: 0 } })).toBe('Immediate');
  });

  it.each([
    [1, 'After 2 matches'],
    [3, 'After 4 matches'],
  ])(
    'describes a pending count of %i as a match delay for the evaluation it resolves on',
    (count, expected) => {
      expect(formatAlertDelay({ pending: { count } })).toBe(expected);
    }
  );

  it('describes a pending count of zero ORed with a timeframe as immediate', () => {
    expect(
      formatAlertDelay({
        pending: { count: 0, timeframe: '5m', operator: 'or' },
      } as StateTransition)
    ).toBe('Immediate');
  });

  it('describes a pending count of zero ANDed with a timeframe as the timeframe alone', () => {
    expect(
      formatAlertDelay({
        pending: { count: 0, timeframe: '5m', operator: 'and' },
      } as StateTransition)
    ).toBe('After 5 min');
  });

  it('describes a count ANDed with a timeframe for the evaluation it resolves on', () => {
    expect(
      formatAlertDelay({
        pending: { count: 2, timeframe: '5m', operator: 'and' },
      } as StateTransition)
    ).toBe('After 3 matches and 5 min');
  });

  it('describes a timeframe on its own', () => {
    expect(formatAlertDelay({ pending: { timeframe: '5m' } })).toBe('After 5 min');
  });
});

describe('formatRecoveryDelay', () => {
  it('returns the empty value when no recovering threshold is configured', () => {
    expect(formatRecoveryDelay(undefined)).toBe(EMPTY_VALUE);
  });

  it('describes a recovering count of zero as immediate', () => {
    expect(formatRecoveryDelay({ recovering: { count: 0 } })).toBe('Immediate');
  });

  it('describes a recovering count above zero as a recovery delay for the evaluation it resolves on', () => {
    expect(formatRecoveryDelay({ recovering: { count: 2 } })).toBe('After 3 recoveries');
  });

  it('describes a recovering count of zero ANDed with a timeframe as the timeframe alone', () => {
    expect(
      formatRecoveryDelay({
        recovering: { count: 0, timeframe: '5m', operator: 'and' },
      } as StateTransition)
    ).toBe('After 5 min');
  });
});
