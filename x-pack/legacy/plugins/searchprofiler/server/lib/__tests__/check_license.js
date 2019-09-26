/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import { checkLicense } from '../check_license';

describe('check_license', function () {

  let mockLicenseInfo;
  beforeEach(() => mockLicenseInfo = {});

  describe('license information is not available', () => {
    beforeEach(() => mockLicenseInfo.isAvailable = () => false);

    it('should set showLinks to true', () => {
      expect(checkLicense(mockLicenseInfo).showAppLink).to.be(true);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).enableAppLink).to.be(false);
    });
  });

  describe('license information is available', () => {
    beforeEach(() => {
      mockLicenseInfo.isAvailable = () => true;
      set(mockLicenseInfo, 'license.getType', () => 'basic');
    });

    describe('& license is trial, standard, gold, platinum', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => true));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it ('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showAppLink).to.be(true);
        });

        it ('should set enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).enableAppLink).to.be(true);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it ('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showAppLink).to.be(true);
        });

        it ('should set enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).enableAppLink).to.be(false);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => false));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it ('should set showLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).showAppLink).to.be(false);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it ('should set showLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).showAppLink).to.be(false);
        });
      });
    });
  });
});
