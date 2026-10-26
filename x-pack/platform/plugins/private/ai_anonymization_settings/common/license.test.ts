/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { isValidLicense } from './license';

const licenseOf = (type: 'basic' | 'gold' | 'platinum' | 'enterprise', status = 'active') =>
  licenseMock.createLicense({ license: { type, mode: type, status: status as 'active' } });

describe('isValidLicense', () => {
  it('accepts an active Enterprise license', () => {
    expect(isValidLicense(licenseOf('enterprise'))).toBe(true);
  });

  it.each(['basic', 'gold', 'platinum'] as const)(
    'rejects %s, because anonymization ships with the Enterprise-only AI features',
    (type) => {
      expect(isValidLicense(licenseOf(type))).toBe(false);
    }
  );

  it('rejects an expired Enterprise license', () => {
    expect(isValidLicense(licenseOf('enterprise', 'expired'))).toBe(false);
  });
});
