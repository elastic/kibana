/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isExpired } from '.';

describe('isExpired', () => {
  it('is true for a past timestamp', () => {
    expect(isExpired('2020-01-01T00:00:00.000Z')).toBe(true);
  });

  it('is false for a future timestamp', () => {
    expect(isExpired('2099-01-01T00:00:00.000Z')).toBe(false);
  });
});
