/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { checkLicense } from './check_license';
import {
  LICENSE_STATUS_UNAVAILABLE,
  LICENSE_STATUS_EXPIRED,
  LICENSE_STATUS_VALID,
  LICENSE_TYPE_BASIC,
} from '../../../common/constants';

describe('check_license', function () {
  const pluginName = 'Foo';
  const minimumLicenseRequired = LICENSE_TYPE_BASIC;
  let mockLicenseInfo;
  beforeEach(() => (mockLicenseInfo = {}));

  describe('license information is undefined', () => {
    beforeEach(() => (mockLicenseInfo = undefined));

    it('should set status to unavailable', () => {
      expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
        LICENSE_STATUS_UNAVAILABLE
      );
    });

    it('should set a message', () => {
      expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message).not.toBe(
        undefined
      );
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => (mockLicenseInfo.isAvailable = () => false));

    it('should set status to unavailable', () => {
      expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
        LICENSE_STATUS_UNAVAILABLE
      );
    });

    it('should set a message', () => {
      expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message).not.toBe(
        undefined
      );
    });
  });

  describe('license information is available', () => {
    beforeEach(() => {
      mockLicenseInfo.isAvailable = () => true;
      set(mockLicenseInfo, 'license.getType', () => LICENSE_TYPE_BASIC);
    });

    describe('& license is trial, standard, gold, platinum', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => true));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set status to valid', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
            LICENSE_STATUS_VALID
          );
        });

        it('should not set a message', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message).toBe(
            undefined
          );
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set status to inactive', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
            LICENSE_STATUS_EXPIRED
          );
        });

        it('should set a message', () => {
          expect(
            checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message
          ).not.toBe(undefined);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => true));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set status to valid', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
            LICENSE_STATUS_VALID
          );
        });

        it('should not set a message', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message).toBe(
            undefined
          );
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set status to inactive', () => {
          expect(checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).status).toBe(
            LICENSE_STATUS_EXPIRED
          );
        });

        it('should set a message', () => {
          expect(
            checkLicense(pluginName, minimumLicenseRequired, mockLicenseInfo).message
          ).not.toBe(undefined);
        });
      });
    });
  });
});
