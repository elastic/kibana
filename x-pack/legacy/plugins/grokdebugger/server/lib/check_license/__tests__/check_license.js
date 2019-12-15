/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import { checkLicense } from '../check_license';

describe('check_license', function() {
  let mockLicenseInfo;
  beforeEach(() => (mockLicenseInfo = {}));

  describe('license information is undefined', () => {
    beforeEach(() => (mockLicenseInfo = undefined));

    it('should set enableLink to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLink).to.be(false);
    });

    it('should set enableAPIRoute to false', () => {
      expect(checkLicense(mockLicenseInfo).enableAPIRoute).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => (mockLicenseInfo.isAvailable = () => false));

    it('should set enableLink to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLink).to.be(false);
    });

    it('should set enableAPIRoute to false', () => {
      expect(checkLicense(mockLicenseInfo).enableAPIRoute).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
    });
  });

  describe('license information is available', () => {
    beforeEach(
      () =>
        (mockLicenseInfo = {
          isAvailable: () => true,
          license: {
            getType: () => 'foobar',
          },
        })
    );

    describe('& license is active', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

      it('should set enableLink to true', () => {
        expect(checkLicense(mockLicenseInfo).enableLink).to.be(true);
      });

      it('should set enableAPIRoute to true', () => {
        expect(checkLicense(mockLicenseInfo).enableAPIRoute).to.be(true);
      });

      it('should NOT set a message', () => {
        expect(checkLicense(mockLicenseInfo).message).to.be(undefined);
      });
    });

    describe('& license is expired', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

      it('should set enableLink to false', () => {
        expect(checkLicense(mockLicenseInfo).enableLink).to.be(false);
      });

      it('should set enableAPIRoute to false', () => {
        expect(checkLicense(mockLicenseInfo).enableAPIRoute).to.be(false);
      });

      it('should set a message', () => {
        expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
      });
    });
  });
});
