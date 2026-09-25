/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCaseSettings,
  isObservablesExtractionBlocked,
  resolveExtractObservables,
} from './case_settings';

describe('getCaseSettings', () => {
  it('returns Security owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('securitySolution')).toEqual({
      syncAlerts: true,
      extractObservables: true,
      observablesEnabled: true,
    });
  });

  it('returns Stack owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('cases')).toEqual({
      syncAlerts: false,
      extractObservables: false,
      observablesEnabled: true,
    });
  });

  it('returns Observability owner flags from OWNER_INFO', () => {
    expect(getCaseSettings('observability')).toEqual({
      syncAlerts: false,
      extractObservables: false,
      observablesEnabled: false,
    });
  });

  it.each([[''], ['foobar'], ['toString'], ['constructor']])(
    'defaults every flag off for unknown owner %j',
    (owner) => {
      expect(getCaseSettings(owner)).toEqual({
        syncAlerts: false,
        extractObservables: false,
        observablesEnabled: false,
      });
    }
  );
});

describe('isObservablesExtractionBlocked', () => {
  it('returns true only for Observability (known owner with observables disabled)', () => {
    expect(isObservablesExtractionBlocked('observability')).toBe(true);
  });

  it('returns false for Security', () => {
    expect(isObservablesExtractionBlocked('securitySolution')).toBe(false);
  });

  it('returns false for Stack', () => {
    expect(isObservablesExtractionBlocked('cases')).toBe(false);
  });

  it.each([[''], ['foobar'], ['securitySolutionFixture']])(
    'returns false for unknown owner %j so space config is respected',
    (owner) => {
      expect(isObservablesExtractionBlocked(owner)).toBe(false);
    }
  );
});

describe('resolveExtractObservables', () => {
  it('returns false for Observability regardless of space config', () => {
    expect(resolveExtractObservables('observability', true)).toBe(false);
    expect(resolveExtractObservables('observability', false)).toBe(false);
    expect(resolveExtractObservables('observability', undefined)).toBe(false);
  });

  it('returns the space config value when present for Security', () => {
    expect(resolveExtractObservables('securitySolution', true)).toBe(true);
    expect(resolveExtractObservables('securitySolution', false)).toBe(false);
  });

  it('falls back to Security autoExtractDefault (true) when no space config exists', () => {
    expect(resolveExtractObservables('securitySolution', undefined)).toBe(true);
  });

  it('falls back to Stack autoExtractDefault (false) when no space config exists', () => {
    expect(resolveExtractObservables('cases', undefined)).toBe(false);
  });

  it('falls back to false for unknown owners when no space config exists', () => {
    expect(resolveExtractObservables('unknownOwner', undefined)).toBe(false);
  });

  it('respects explicit space config for unknown owners', () => {
    expect(resolveExtractObservables('unknownOwner', true)).toBe(true);
  });
});
