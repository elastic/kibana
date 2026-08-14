/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldClearSession } from './onboarding_app';

describe('shouldClearSession', () => {
  const tileEntry = (overrides: { pathname?: string; search?: string; state?: unknown } = {}) => ({
    pathname: '/aws',
    search: '',
    state: { newSession: true },
    ...overrides,
  });

  it('returns true on tile entry — integration id + newSession flag, no deploymentId', () => {
    expect(shouldClearSession(tileEntry())).toBe(true);
  });

  it('returns false after flag is consumed — reload has no newSession flag', () => {
    expect(shouldClearSession(tileEntry({ state: undefined }))).toBe(false);
  });

  it('returns false when newSession is false', () => {
    expect(shouldClearSession(tileEntry({ state: { newSession: false } }))).toBe(false);
  });

  it('returns false when pathname has no integration id (root redirect)', () => {
    expect(shouldClearSession(tileEntry({ pathname: '/' }))).toBe(false);
  });

  it('defers to hydration path when ?deploymentId is present', () => {
    expect(shouldClearSession(tileEntry({ search: '?deploymentId=abc' }))).toBe(false);
  });

  it('returns true when other query params are present but deploymentId is not', () => {
    expect(shouldClearSession(tileEntry({ search: '?foo=bar' }))).toBe(true);
  });
});
