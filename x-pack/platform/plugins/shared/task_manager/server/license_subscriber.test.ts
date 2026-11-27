/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseSubscriber } from './license_subscriber';
import { Subject } from 'rxjs';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { ILicense } from '@kbn/licensing-types';

describe('LicenseSubscriber', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getIsSecurityEnabled', () => {
    test('should return true if security is enabled', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      const basicLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'basic' },
        features: { security: { isEnabled: true, isAvailable: true } },
      });

      license.next(basicLicense);
      expect(licenseSubscriber.getIsSecurityEnabled()).toEqual(true);
    });

    test('should return false if security doesnt exist', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      expect(licenseSubscriber.getIsSecurityEnabled()).toEqual(false);
    });

    test('should return false if security is disabled', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      const basicLicense = licensingMock.createLicense({
        license: { status: 'active', type: 'basic' },
        features: { security: { isEnabled: false, isAvailable: true } },
      });

      license.next(basicLicense);
      expect(licenseSubscriber.getIsSecurityEnabled()).toEqual(false);
    });
  });

  describe('getIsSecurityDisabled', () => {
    test('should return false if security is enabled', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      license.next(
        licensingMock.createLicense({
          license: { status: 'active', type: 'basic' },
          features: { security: { isEnabled: true, isAvailable: true } },
        })
      );
      expect(licenseSubscriber.getIsSecurityDisabled()).toEqual(false);
    });

    test('should return true if security is disabled', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      license.next(
        licensingMock.createLicense({
          license: { status: 'active', type: 'basic' },
          features: { security: { isEnabled: false, isAvailable: true } },
        })
      );
      expect(licenseSubscriber.getIsSecurityDisabled()).toEqual(true);
    });

    test('should return false if the license has no security feature', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      license.next(
        licensingMock.createLicense({
          license: { status: 'active', type: 'basic' },
        })
      );
      expect(licenseSubscriber.getIsSecurityDisabled()).toEqual(false);
    });

    test('should return false if no license has been received', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      expect(licenseSubscriber.getIsSecurityDisabled()).toEqual(false);
    });

    test('should return false if the license is unavailable', () => {
      const license: Subject<ILicense> = new Subject();
      const licenseSubscriber = new LicenseSubscriber(license);

      const unavailableLicense = licensingMock.createLicenseMock();
      unavailableLicense.isAvailable = false;
      unavailableLicense.getFeature.mockReturnValue({ isAvailable: false, isEnabled: false });

      license.next(unavailableLicense);
      expect(licenseSubscriber.getIsSecurityDisabled()).toEqual(false);
    });
  });
});
