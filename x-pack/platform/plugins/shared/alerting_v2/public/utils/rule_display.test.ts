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

  it.each([0, 1])('describes a pending count of %i as immediate', (pendingCount) => {
    expect(formatAlertDelay({ pending_count: pendingCount })).toBe('Immediate');
  });

  it('describes a pending count above one as a match delay', () => {
    expect(formatAlertDelay({ pending_count: 3 })).toBe('After 3 matches');
  });

  it('describes a timeframe ANDed with a count of one as a delay', () => {
    expect(
      formatAlertDelay({
        pending_count: 1,
        pending_timeframe: '5m',
        pending_operator: 'AND',
      } as StateTransition)
    ).toBe('After 1 match and 5 min');
  });

  it.each(['OR', undefined] as const)(
    'describes a timeframe with a count of one as immediate when the operator is %s',
    (pendingOperator) => {
      expect(
        formatAlertDelay({
          pending_count: 1,
          pending_timeframe: '5m',
          ...(pendingOperator != null ? { pending_operator: pendingOperator } : {}),
        } as StateTransition)
      ).toBe('Immediate');
    }
  );

  it.each(['AND', 'OR'] as const)(
    'describes a pending count of zero as immediate even with a timeframe and %s',
    (pendingOperator) => {
      expect(
        formatAlertDelay({
          pending_count: 0,
          pending_timeframe: '5m',
          pending_operator: pendingOperator,
        } as StateTransition)
      ).toBe('Immediate');
    }
  );

  it('describes a timeframe on its own', () => {
    expect(formatAlertDelay({ pending_timeframe: '5m' })).toBe('After 5 min');
  });
});

describe('formatRecoveryDelay', () => {
  it('returns the empty value when no recovering threshold is configured', () => {
    expect(formatRecoveryDelay(undefined)).toBe(EMPTY_VALUE);
  });

  it.each([0, 1])('describes a recovering count of %i as immediate', (recoveringCount) => {
    expect(formatRecoveryDelay({ recovering_count: recoveringCount })).toBe('Immediate');
  });

  it('describes a recovering count above one as a recovery delay', () => {
    expect(formatRecoveryDelay({ recovering_count: 2 })).toBe('After 2 recoveries');
  });
});
