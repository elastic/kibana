/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidTimeZone } from './time_zone_utils';

describe('Overrides utilities', () => {
  it('should return true for case-sensitive, acceptable timezones', async () => {
    expect(isValidTimeZone('America/New_York')).toEqual(true);
    expect(isValidTimeZone('America/Chicago')).toEqual(true);
    expect(isValidTimeZone('UTC')).toEqual(true);
  });
  it('should return false for invalid input', async () => {
    expect(isValidTimeZone('')).toEqual(false);
    expect(isValidTimeZone()).toEqual(false);
    expect(isValidTimeZone('Browser')).toEqual(false);
    expect(isValidTimeZone('EST')).toEqual(false);
    expect(isValidTimeZone('HST')).toEqual(false);
  });
});
