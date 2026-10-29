/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallSource } from '../../../../common/types';

import { isTrustedInstallSource } from './install_source';

describe('isTrustedInstallSource', () => {
  it.each(['registry', 'bundled'] as const)('trusts %s', (installSource) => {
    expect(isTrustedInstallSource(installSource)).toBe(true);
  });

  it.each(['upload', 'custom'] as const)('does not trust %s', (installSource) => {
    expect(isTrustedInstallSource(installSource)).toBe(false);
  });

  it('fails closed for a missing or unknown install source', () => {
    expect(isTrustedInstallSource(undefined)).toBe(false);
    expect(isTrustedInstallSource('something_new' as InstallSource)).toBe(false);
  });
});
