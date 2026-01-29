/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { ILicenseState } from './license_state';
import { LicenseState } from './license_state';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { ILicense } from '@kbn/licensing-types';

describe('checkLicense()', () => {
  const getRawLicense = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('status is LICENSE_STATUS_INVALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'invalid' } });
      license.check = jest.fn(() => ({
        state: 'invalid',
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be disabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const actionsLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(actionsLicenseInfo.enableAppLink).toBe(false);
    });
  });

  describe('status is LICENSE_STATUS_VALID', () => {
    beforeEach(() => {
      const license = licensingMock.createLicense({ license: { status: 'active' } });
      license.check = jest.fn(() => ({
        state: 'valid',
      }));
      getRawLicense.mockReturnValue(license);
    });

    it('check application link should be enabled', () => {
      const licensing = licensingMock.createSetup();
      const licenseState = new LicenseState(licensing.license$);
      const actionsLicenseInfo = licenseState.checkLicense(getRawLicense());
      expect(actionsLicenseInfo.showAppLink).toBe(true);
    });
  });
});

describe('getIsSecurityEnabled()', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
  });

  test('should return null when license is not defined', () => {
    expect(licenseState.getIsSecurityEnabled()).toBeNull();
  });

  test('should return null when license is unavailable', () => {
    license.next(createUnavailableLicense());
    expect(licenseState.getIsSecurityEnabled()).toBeNull();
  });

  test('should return true if security is enabled', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
      features: { security: { isEnabled: true, isAvailable: true } },
    });
    license.next(basicLicense);
    expect(licenseState.getIsSecurityEnabled()).toEqual(true);
  });

  test('should return false if security is not enabled', () => {
    const basicLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'basic' },
      features: { security: { isEnabled: false, isAvailable: true } },
    });
    license.next(basicLicense);
    expect(licenseState.getIsSecurityEnabled()).toEqual(false);
  });
});

describe('ensureLicenseForMaintenanceWindow()', () => {
  let license: Subject<ILicense>;
  let licenseState: ILicenseState;
  beforeEach(() => {
    license = new Subject();
    licenseState = new LicenseState(license);
  });

  test('should throw if license is not defined', () => {
    expect(() =>
      licenseState.ensureLicenseForMaintenanceWindow()
    ).toThrowErrorMatchingInlineSnapshot(
      `"Maintenance window is disabled because license information is not available at this time."`
    );
  });

  test('should throw if license is not available', () => {
    license.next(createUnavailableLicense());
    expect(() =>
      licenseState.ensureLicenseForMaintenanceWindow()
    ).toThrowErrorMatchingInlineSnapshot(
      `"Maintenance window is disabled because license information is not available at this time."`
    );
  });

  test('should throw if license is not platinum', () => {
    const goldLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'gold' },
    });
    license.next(goldLicense);

    expect(() =>
      licenseState.ensureLicenseForMaintenanceWindow()
    ).toThrowErrorMatchingInlineSnapshot(
      `"Maintenance window is disabled because it requires a platinum license. Go to License Management to view upgrade options."`
    );
  });

  test('should not throw when license is valid', () => {
    const platinumLicense = licensingMock.createLicense({
      license: { status: 'active', type: 'platinum' },
    });
    license.next(platinumLicense);
    licenseState.ensureLicenseForMaintenanceWindow();
  });
});

function createUnavailableLicense() {
  const unavailableLicense = licensingMock.createLicenseMock();
  unavailableLicense.isAvailable = false;
  return unavailableLicense;
}
