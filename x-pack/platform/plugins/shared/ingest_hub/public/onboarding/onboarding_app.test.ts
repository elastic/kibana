/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldClearSession, detypifyVarsForSession } from './onboarding_app';

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

describe('detypifyVarsForSession', () => {
  it('joins string arrays to comma-separated string', () => {
    expect(detypifyVarsForSession(['us-east-1', 'eu-west-1'])).toBe('us-east-1,eu-west-1');
  });

  it('leaves strings unchanged', () => {
    expect(detypifyVarsForSession('us-east-1')).toBe('us-east-1');
  });

  it('leaves numbers unchanged', () => {
    expect(detypifyVarsForSession(42)).toBe(42);
  });

  it('leaves booleans unchanged', () => {
    expect(detypifyVarsForSession(true)).toBe(true);
  });

  it('leaves null unchanged', () => {
    expect(detypifyVarsForSession(null)).toBeNull();
  });

  it('recurses into nested objects', () => {
    const input = {
      varsByInput: {
        'aws-s3': { regions: ['us-east-1', 'eu-west-1'], bucket_arn: 'arn:aws:s3:::test' },
      },
    };
    expect(detypifyVarsForSession(input)).toEqual({
      varsByInput: {
        'aws-s3': { regions: 'us-east-1,eu-west-1', bucket_arn: 'arn:aws:s3:::test' },
      },
    });
  });

  it('converts arrays inside nested ServiceVars structure', () => {
    const soServiceVars = {
      svc: {
        enabledDataStreams: ['svc'],
        varsByDataStream: {
          svc: { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': { regions: ['us-east-1'] } } },
        },
      },
    };
    const result = detypifyVarsForSession(soServiceVars) as typeof soServiceVars;
    expect((result as any).svc.varsByDataStream.svc.varsByInput['aws-s3'].regions).toBe(
      'us-east-1'
    );
  });

  it('produces empty string for an empty array (no items to join)', () => {
    expect(detypifyVarsForSession([])).toBe('');
  });
});
