/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCOUT_TARGET, resolveScoutTarget } from './scout_target';

describe('resolveScoutTarget', () => {
  const serverlessSuite = {
    id: 'nightshift-investigations',
    scoutArch: 'serverless',
    scoutDomain: 'observability_complete',
  };

  it('defaults to stateful/classic for suites without Scout settings', () => {
    expect(resolveScoutTarget(undefined)).toEqual(DEFAULT_SCOUT_TARGET);
    expect(resolveScoutTarget({ id: 'agent-builder' })).toEqual(DEFAULT_SCOUT_TARGET);
  });

  it("uses the suite's arch and domain", () => {
    expect(resolveScoutTarget(serverlessSuite)).toEqual({
      arch: 'serverless',
      domain: 'observability_complete',
    });
  });

  it('keeps the suite target when the override matches its arch', () => {
    expect(resolveScoutTarget(serverlessSuite, 'serverless')).toEqual({
      arch: 'serverless',
      domain: 'observability_complete',
    });
  });

  it('opts a serverless suite back into stateful/classic', () => {
    expect(resolveScoutTarget(serverlessSuite, 'stateful')).toEqual(DEFAULT_SCOUT_TARGET);
  });

  it('refuses to switch a stateful suite to serverless without a serverless domain', () => {
    expect(() => resolveScoutTarget({ id: 'agent-builder' }, 'serverless')).toThrow(
      'Suite "agent-builder" has no serverless scoutDomain in evals.suites.json'
    );
  });

  it('rejects an unknown override', () => {
    expect(() => resolveScoutTarget(serverlessSuite, 'cloud')).toThrow(
      'Invalid Scout arch "cloud" (expected stateful or serverless)'
    );
  });

  it('rejects invalid suite metadata', () => {
    expect(() => resolveScoutTarget({ id: 'x', scoutArch: 'cloud' })).toThrow(
      'Suite "x" has an invalid scoutArch "cloud" (expected stateful or serverless)'
    );
    expect(() => resolveScoutTarget({ id: 'x', scoutArch: 'serverless' })).toThrow(
      'Suite "x" sets scoutArch "serverless" without a scoutDomain'
    );
  });
});
