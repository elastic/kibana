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

  it('returns the integration id on tile entry — integration id + newSession flag, no deploymentId', () => {
    expect(shouldClearSession(tileEntry())).toBe('aws');
  });

  it('returns null after flag is consumed — reload has no newSession flag', () => {
    expect(shouldClearSession(tileEntry({ state: undefined }))).toBeNull();
  });

  it('returns null when newSession is false', () => {
    expect(shouldClearSession(tileEntry({ state: { newSession: false } }))).toBeNull();
  });

  it('returns null when pathname has no integration id (root redirect)', () => {
    expect(shouldClearSession(tileEntry({ pathname: '/' }))).toBeNull();
  });

  it('defers to hydration path when ?deploymentId is present', () => {
    expect(shouldClearSession(tileEntry({ search: '?deploymentId=abc' }))).toBeNull();
  });

  it('returns the integration id when other query params are present but deploymentId is not', () => {
    expect(shouldClearSession(tileEntry({ search: '?foo=bar' }))).toBe('aws');
  });
});
