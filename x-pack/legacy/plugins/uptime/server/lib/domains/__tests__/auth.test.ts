/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMAuthDomain } from '../auth';

describe('Auth domain lib', () => {
  let domain: UMAuthDomain;
  let mockAdapter: any;
  let mockGetLicenseType: jest.Mock<any, any>;
  let mockLicenseIsActive: jest.Mock<any, any>;

  beforeEach(() => {
    mockAdapter = jest.fn();
    mockGetLicenseType = jest.fn();
    mockLicenseIsActive = jest.fn();
    domain = new UMAuthDomain(mockAdapter, {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws for null license', () => {
    mockGetLicenseType.mockReturnValue(null);
    mockAdapter.getLicenseType = mockGetLicenseType;
    expect(() => domain.requestIsValid({})).toThrowErrorMatchingSnapshot();
  });

  it('throws for unsupported license type', () => {
    mockGetLicenseType.mockReturnValue('oss');
    mockAdapter.getLicenseType = mockGetLicenseType;
    expect(() => domain.requestIsValid({})).toThrowErrorMatchingSnapshot();
  });

  it('throws for inactive license', () => {
    mockLicenseIsActive.mockReturnValue(false);
    mockAdapter.licenseIsActive = mockLicenseIsActive;
    expect(() => domain.requestIsValid({})).toThrowErrorMatchingSnapshot();
  });

  it('throws if request is not authenticated', () => {
    mockGetLicenseType.mockReturnValue('basic');
    mockLicenseIsActive.mockReturnValue(true);
    mockAdapter.getLicenseType = mockGetLicenseType;
    mockAdapter.licenseIsActive = mockLicenseIsActive;
    expect(() => domain.requestIsValid({})).toThrowErrorMatchingSnapshot();
  });

  it('accepts request if authenticated', () => {
    mockGetLicenseType.mockReturnValue('basic');
    mockLicenseIsActive.mockReturnValue(true);
    mockAdapter.getLicenseType = mockGetLicenseType;
    mockAdapter.licenseIsActive = mockLicenseIsActive;
    expect(domain.requestIsValid({ auth: { isAuthenticated: true } })).toEqual(true);
  });
});
