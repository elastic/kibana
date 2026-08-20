/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasLiveReservation, isReservedToAttempt } from './reservation';

describe('hasLiveReservation', () => {
  it('is true only while installing with an attempt id', () => {
    expect(
      hasLiveReservation({ install_status: 'installing', dataset_claim_attempt_id: 'a' })
    ).toBe(true);
    expect(
      hasLiveReservation({ install_status: 'installing', dataset_claim_attempt_id: null })
    ).toBe(false);
    expect(hasLiveReservation({ install_status: 'installed', dataset_claim_attempt_id: 'a' })).toBe(
      false
    );
    expect(hasLiveReservation(undefined)).toBe(false);
  });
});

describe('isReservedToAttempt', () => {
  it('matches the stored attempt id', () => {
    expect(isReservedToAttempt({ dataset_claim_attempt_id: 'a' }, 'a')).toBe(true);
    expect(isReservedToAttempt({ dataset_claim_attempt_id: 'a' }, 'b')).toBe(false);
    expect(isReservedToAttempt(undefined, 'a')).toBe(false);
  });
});
