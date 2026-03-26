/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateTimezone } from './v1';

describe('validateTimezone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates time zone correctly', () => {
    expect(validateTimezone('America/New_York')).toBeUndefined();
  });

  it('validates correctly when no timezone', () => {
    expect(validateTimezone()).toBeUndefined();
  });

  it('throws error for invalid combination', () => {
    expect(validateTimezone('Europe/India')).toEqual('Invalid schedule timezone: Europe/India');
  });

  it('throws error for invalid timezone', () => {
    expect(validateTimezone('invalid')).toEqual('Invalid schedule timezone: invalid');
  });

  it('throws error for empty string', () => {
    expect(validateTimezone(' ')).toEqual('Invalid schedule timezone:  ');
  });
});
