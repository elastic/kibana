/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ILicenseState } from './license_state';

export const createLicenseStateMock = () => {
  const licenseState: jest.Mocked<ILicenseState> = {
    clean: jest.fn(),
    getLicenseInformation: jest.fn(),
    ensureLicenseForActionType: jest.fn(),
    isLicenseValidForActionType: jest.fn(),
    setNotifyUsage: jest.fn(),
    checkLicense: jest.fn().mockResolvedValue({
      state: 'valid',
    }),
  };
  return licenseState;
};

export const licenseStateMock = {
  create: createLicenseStateMock,
};
