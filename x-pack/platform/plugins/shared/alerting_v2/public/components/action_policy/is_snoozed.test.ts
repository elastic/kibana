/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSnoozed } from './is_snoozed';

describe('isSnoozed', () => {
  it('returns true when snoozedUntil is in the future', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString();
    expect(isSnoozed(future)).toBe(true);
  });

  it('returns false when snoozedUntil is in the past', () => {
    const past = new Date(Date.now() - 3_600_000).toISOString();
    expect(isSnoozed(past)).toBe(false);
  });

  it('returns false when snoozedUntil is null', () => {
    expect(isSnoozed(null)).toBe(false);
  });

  it('returns false when snoozedUntil is undefined', () => {
    expect(isSnoozed(undefined)).toBe(false);
  });
});
