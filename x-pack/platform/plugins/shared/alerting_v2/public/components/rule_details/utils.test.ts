/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleApiResponse } from '../../services/rules_api';
import { EMPTY_VALUE, formatAlertDelay, formatRecoveryDelay } from './utils';

type StateTransition = RuleApiResponse['state_transition'];

describe('formatAlertDelay', () => {
  it('returns the empty value when no pending threshold is configured', () => {
    expect(formatAlertDelay(undefined)).toBe(EMPTY_VALUE);
    expect(formatAlertDelay({} as StateTransition)).toBe(EMPTY_VALUE);
  });

  it.each([0, 1])('describes a pending count of %i as immediate', (pendingCount) => {
    expect(formatAlertDelay({ pending_count: pendingCount } as StateTransition)).toBe('Immediate');
  });

  it('describes a pending count above one as a match delay', () => {
    expect(formatAlertDelay({ pending_count: 3 } as StateTransition)).toBe('After 3 matches');
  });

  it('describes a timeframe alongside a count of one', () => {
    expect(
      formatAlertDelay({
        pending_count: 1,
        pending_timeframe: '5m',
        pending_operator: 'AND',
      } as StateTransition)
    ).toBe('After 1 match and 5 min');
  });

  it('describes a timeframe on its own', () => {
    expect(formatAlertDelay({ pending_timeframe: '5m' } as StateTransition)).toBe('After 5 min');
  });
});

describe('formatRecoveryDelay', () => {
  it('returns the empty value when no recovering threshold is configured', () => {
    expect(formatRecoveryDelay(undefined)).toBe(EMPTY_VALUE);
  });

  it.each([0, 1])('describes a recovering count of %i as immediate', (recoveringCount) => {
    expect(formatRecoveryDelay({ recovering_count: recoveringCount } as StateTransition)).toBe(
      'Immediate'
    );
  });

  it('describes a recovering count above one as a recovery delay', () => {
    expect(formatRecoveryDelay({ recovering_count: 2 } as StateTransition)).toBe(
      'After 2 recoveries'
    );
  });
});
