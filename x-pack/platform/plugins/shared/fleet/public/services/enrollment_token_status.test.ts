/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEnrollmentTokenStatus, isEnrollmentTokenExpired } from './enrollment_token_status';

const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();
const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe('isEnrollmentTokenExpired', () => {
  it('is true past the expiration date', () => {
    expect(isEnrollmentTokenExpired({ expire_at: anHourAgo() })).toBe(true);
  });

  it('is false before the expiration date', () => {
    expect(isEnrollmentTokenExpired({ expire_at: inAnHour() })).toBe(false);
  });

  it('is false without an expiration date', () => {
    expect(isEnrollmentTokenExpired({})).toBe(false);
  });

  it('is false for an expiration date that cannot be parsed', () => {
    expect(isEnrollmentTokenExpired({ expire_at: 'not a date' })).toBe(false);
  });
});

describe('getEnrollmentTokenStatus', () => {
  it('reports an expired token as expired rather than active', () => {
    expect(getEnrollmentTokenStatus({ active: true, expire_at: anHourAgo() })).toEqual('expired');
  });

  it('reports a token that has not reached its expiration as active', () => {
    expect(getEnrollmentTokenStatus({ active: true, expire_at: inAnHour() })).toEqual('active');
  });

  it('reports a token with no expiration as active', () => {
    expect(getEnrollmentTokenStatus({ active: true })).toEqual('active');
  });

  it('reports a revoked token as inactive whether or not it has expired', () => {
    expect(getEnrollmentTokenStatus({ active: false })).toEqual('inactive');
    expect(getEnrollmentTokenStatus({ active: false, expire_at: anHourAgo() })).toEqual('inactive');
  });
});
