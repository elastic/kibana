/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from '../../../../../../../plugins/licensing/server';
import { licenseCheck } from '../license';

describe('license check', () => {
  let mockLicense: Pick<ILicense, 'isActive' | 'hasAtLeast'>;

  it('throws for null license', () => {
    expect(licenseCheck(null)).toMatchSnapshot();
  });

  it('throws for unsupported license type', () => {
    mockLicense = {
      hasAtLeast: jest.fn().mockReturnValue(false),
      isActive: false,
    };
    expect(licenseCheck(mockLicense)).toMatchSnapshot();
  });

  it('throws for inactive license', () => {
    mockLicense = {
      hasAtLeast: jest.fn().mockReturnValue(true),
      isActive: false,
    };
    expect(licenseCheck(mockLicense)).toMatchSnapshot();
  });

  it('returns result for a valid license', () => {
    mockLicense = {
      hasAtLeast: jest.fn().mockReturnValue(true),
      isActive: true,
    };
    expect(licenseCheck(mockLicense)).toMatchSnapshot();
  });
});
