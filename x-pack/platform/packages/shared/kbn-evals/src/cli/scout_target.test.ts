/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SCOUT_TARGET, resolveScoutTarget } from './scout_target';

describe('resolveScoutTarget', () => {
  const serverlessSuite = { scoutArch: 'serverless', scoutDomain: 'observability_complete' };

  it('defaults to stateful/classic for suites without Scout settings', () => {
    expect(resolveScoutTarget(undefined)).toEqual(DEFAULT_SCOUT_TARGET);
    expect(resolveScoutTarget({})).toEqual(DEFAULT_SCOUT_TARGET);
  });

  it("uses the suite's arch and domain", () => {
    expect(resolveScoutTarget(serverlessSuite)).toEqual({
      arch: 'serverless',
      domain: 'observability_complete',
    });
  });

  it('opts a serverless suite into stateful/classic with --scout-arch stateful', () => {
    expect(resolveScoutTarget(serverlessSuite, { arch: 'stateful' })).toEqual(DEFAULT_SCOUT_TARGET);
  });

  it('passes --scout-arch / --scout-domain through for any suite or custom config', () => {
    expect(resolveScoutTarget(undefined, { arch: 'serverless', domain: 'search' })).toEqual({
      arch: 'serverless',
      domain: 'search',
    });
    expect(resolveScoutTarget(serverlessSuite, { domain: 'security_complete' })).toEqual({
      arch: 'serverless',
      domain: 'security_complete',
    });
  });

  it('asks for --scout-domain when serverless has no domain', () => {
    expect(() => resolveScoutTarget(undefined, { arch: 'serverless' })).toThrow(
      'Serverless needs a Scout domain: pass --scout-domain (e.g. observability_complete)'
    );
  });

  it('rejects an unknown --scout-arch', () => {
    expect(() => resolveScoutTarget(serverlessSuite, { arch: 'cloud' })).toThrow(
      'Invalid Scout arch "cloud" (expected stateful or serverless)'
    );
  });

  it('names the suite when its scoutArch is invalid', () => {
    expect(() => resolveScoutTarget({ id: 'my-suite', scoutArch: 'cloud' })).toThrow(
      'Suite "my-suite" has an invalid scoutArch "cloud" in evals.suites.json (expected stateful or serverless)'
    );
  });
});
