/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import sinon from 'sinon';
import { checkLicense } from '../check_license';

describe('check_license: ', function() {
  let mockLicenseInfo;
  let licenseCheckResult;

  beforeEach(() => {
    mockLicenseInfo = {
      isAvailable: () => true,
    };
  });

  describe('mockLicenseInfo is not set', () => {
    beforeEach(() => {
      mockLicenseInfo = null;
      licenseCheckResult = checkLicense(mockLicenseInfo);
    });

    it('should set showAppLink to true', () => {
      expect(licenseCheckResult.showAppLink).to.be(true);
    });

    it('should set enableAppLink to false', () => {
      expect(licenseCheckResult.enableAppLink).to.be(false);
    });
  });

  describe('mockLicenseInfo is set but not available', () => {
    beforeEach(() => {
      mockLicenseInfo = { isAvailable: () => false };
      licenseCheckResult = checkLicense(mockLicenseInfo);
    });

    it('should set showAppLink to true', () => {
      expect(licenseCheckResult.showAppLink).to.be(true);
    });

    it('should set enableAppLink to false', () => {
      expect(licenseCheckResult.enableAppLink).to.be(false);
    });
  });

  describe('graph is disabled in Elasticsearch', () => {
    beforeEach(() => {
      set(
        mockLicenseInfo,
        'feature',
        sinon
          .stub()
          .withArgs('graph')
          .returns({ isEnabled: () => false })
      );
      licenseCheckResult = checkLicense(mockLicenseInfo);
    });

    it('should set showAppLink to false', () => {
      expect(licenseCheckResult.showAppLink).to.be(false);
    });
  });

  describe('graph is enabled in Elasticsearch', () => {
    beforeEach(() => {
      set(
        mockLicenseInfo,
        'feature',
        sinon
          .stub()
          .withArgs('graph')
          .returns({ isEnabled: () => true })
      );
    });

    describe('& license is trial or platinum', () => {
      beforeEach(() => {
        set(
          mockLicenseInfo,
          'license.isOneOf',
          sinon
            .stub()
            .withArgs(['trial', 'platinum'])
            .returns(true)
        );
        set(mockLicenseInfo, 'license.getType', () => 'trial');
      });

      describe('& license is active', () => {
        beforeEach(() => {
          set(mockLicenseInfo, 'license.isActive', () => true);
          licenseCheckResult = checkLicense(mockLicenseInfo);
        });

        it('should set showAppLink to true', () => {
          expect(licenseCheckResult.showAppLink).to.be(true);
        });

        it('should set enableAppLink to true', () => {
          expect(licenseCheckResult.enableAppLink).to.be(true);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => {
          set(mockLicenseInfo, 'license.isActive', () => false);
          licenseCheckResult = checkLicense(mockLicenseInfo);
        });

        it('should set showAppLink to true', () => {
          expect(licenseCheckResult.showAppLink).to.be(true);
        });

        it('should set enableAppLink to false', () => {
          expect(licenseCheckResult.enableAppLink).to.be(false);
        });
      });
    });

    describe('& license is neither trial nor platinum', () => {
      beforeEach(() => {
        set(mockLicenseInfo, 'license.isOneOf', () => false);
        set(mockLicenseInfo, 'license.getType', () => 'basic');
        set(mockLicenseInfo, 'license.isActive', () => true);
        licenseCheckResult = checkLicense(mockLicenseInfo);
      });

      it('should set showAppLink to false', () => {
        expect(licenseCheckResult.showAppLink).to.be(false);
      });
    });
  });
});
