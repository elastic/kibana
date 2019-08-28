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

  describe('license information is undefined', () => {
    beforeEach(() => mockLicenseInfo = undefined);

    it('should set isAvailable to false', () => {
      expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
    });

    it('should set isReadOnly to false', () => {
      expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => mockLicenseInfo.isAvailable = () => false);

    it('should set isAvailable to false', () => {
      expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
    });

    it('should set isReadOnly to false', () => {
      expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
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
      beforeEach(() => {
        set(mockLicenseInfo, 'license.isOneOf', () => true);
        mockLicenseInfo.feature = () => ({ isEnabled: () => true }); // Security feature is enabled
      });

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set isAvailable to true', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
        });

        it ('should set enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(true);
        });

        it ('should set isReadOnly to false', () => {
          expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
        });

        it('should not set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.be(undefined);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set isAvailable to true', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
        });

        it ('should set enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(true);
        });

        it ('should set isReadOnly to true', () => {
          expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(true);
        });

        it('should set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => {
        set(mockLicenseInfo, 'license.isOneOf', () => false);
        mockLicenseInfo.feature = () => ({ isEnabled: () => true }); // Security feature is enabled
      });

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set isAvailable to false', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
        });

        it ('should set enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
        });

        it ('should set isReadOnly to false', () => {
          expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
        });

        it('should set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set isAvailable to false', () => {
          expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
        });

        it ('should set enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
        });

        it ('should set isReadOnly to false', () => {
          expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
        });

        it('should set a message', () => {
          expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
        });
      });
    });

    describe('& security is disabled', () => {
      beforeEach(() => {
        mockLicenseInfo.feature = () => ({ isEnabled: () => false }); // Security feature is disabled
        set(mockLicenseInfo, 'license.isOneOf', () => true);
        set(mockLicenseInfo, 'license.isActive', () => true);
      });

      it('should set isAvailable to false', () => {
        expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
      });

      it ('should set enableLinks to false', () => {
        expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
      });

      it ('should set isReadOnly to false', () => {
        expect(checkLicense(mockLicenseInfo).isReadOnly).to.be(false);
      });

      it('should set a message', () => {
        expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
      });
    });
  });
});
