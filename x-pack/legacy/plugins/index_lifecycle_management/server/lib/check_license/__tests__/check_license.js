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

    it('should set isAvailable to false', () => {
      expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
    });

    it('should set showLinks to true', () => {
      expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => (mockLicenseInfo.isAvailable = () => false));

    it('should set isAvailable to false', () => {
      expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
    });

    it('should set showLinks to true', () => {
      expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
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

        it('should set isAvailable to true', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
        });

        it('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
        });

        it('should set enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(true);
        });

        it('should not set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.be(undefined);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set isAvailable to false', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
        });

        it('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
        });

        it('should set enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
        });

        it('should set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => true));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set isAvailable to true', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
        });

        it('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
        });

        it('should set enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(true);
        });

        it('should not set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.be(undefined);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set isAvailable to false', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
        });

        it('should set showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
        });

        it('should set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
        });
      });
    });
  });
});
