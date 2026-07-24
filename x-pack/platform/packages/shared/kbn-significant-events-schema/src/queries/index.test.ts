/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from '../feature';
import { isDurable, isExpired } from '.';

function makeFeature(expiresAt: string | undefined): Feature {
  return { expires_at: expiresAt } as unknown as Feature;
}

describe('isDurable', () => {
  it('is true when expires_at is absent', () => {
    expect(isDurable(makeFeature(undefined))).toBe(true);
  });

  it('is false when expires_at is set', () => {
    expect(isDurable(makeFeature('2020-01-01T00:00:00.000Z'))).toBe(false);
  });
});

describe('isExpired', () => {
  it('is true for a past timestamp', () => {
    expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true);
  });

  it('is false for a future timestamp', () => {
    expect(isExpired('2099-01-01T00:00:00.000Z')).toBe(false);
  });
});
