/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import { checkLicenseFactory } from '../check_license';

describe('check_license', function() {
  let mockLicenseInfo;
  let checkLicense;

  beforeEach(() => {
    mockLicenseInfo = {};
    checkLicense = checkLicenseFactory({
      getAll: () => [
        {
          id: 'test',
          name: 'Test Export Type',
          jobType: 'testJobType',
        },
      ],
    });
  });

  describe('license information is not available', () => {
    beforeEach(() => (mockLicenseInfo.isAvailable = () => false));

    it('should set management.showLinks to true', () => {
      expect(checkLicense(mockLicenseInfo).management.showLinks).to.be(true);
    });

    it('should set test.showLinks to true', () => {
      expect(checkLicense(mockLicenseInfo).test.showLinks).to.be(true);
    });

    it('should set management.enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).management.enableLinks).to.be(false);
    });

    it('should set test.enableLinks to false', () => {
      expect(checkLicense(mockLicenseInfo).test.enableLinks).to.be(false);
    });

    it('should set management.jobTypes to undefined', () => {
      expect(checkLicense(mockLicenseInfo).management.jobTypes).to.be(undefined);
    });
  });

  describe('license information is available', () => {
    beforeEach(() => {
      mockLicenseInfo.isAvailable = () => true;
      set(mockLicenseInfo, 'license.getType', () => 'basic');
    });

    describe('& license is > basic', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => true));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set management.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).management.showLinks).to.be(true);
        });

        it('should set test.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).test.showLinks).to.be(true);
        });

        it('should set management.enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).management.enableLinks).to.be(true);
        });

        it('should set test.enableLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).test.enableLinks).to.be(true);
        });

        it('should set management.jobTypes to contain testJobType', () => {
          expect(checkLicense(mockLicenseInfo).management.jobTypes).to.contain('testJobType');
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set management.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).management.showLinks).to.be(true);
        });

        it('should set test.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).test.showLinks).to.be(true);
        });

        it('should set management.enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).management.enableLinks).to.be(false);
        });

        it('should set test.enableLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).test.enableLinks).to.be(false);
        });

        it('should set management.jobTypes to undefined', () => {
          expect(checkLicense(mockLicenseInfo).management.jobTypes).to.be(undefined);
        });
      });
    });

    describe('& license is basic', () => {
      beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => false));

      describe('& license is active', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

        it('should set management.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).management.showLinks).to.be(false);
        });

        it('should set test.showLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).test.showLinks).to.be(false);
        });

        it('should set management.jobTypes to an empty array', () => {
          expect(checkLicense(mockLicenseInfo).management.jobTypes).to.be.an(Array);
          expect(checkLicense(mockLicenseInfo).management.jobTypes).to.have.length(0);
        });
      });

      describe('& license is expired', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => false));

        it('should set management.showLinks to true', () => {
          expect(checkLicense(mockLicenseInfo).management.showLinks).to.be(true);
        });

        it('should set test.showLinks to false', () => {
          expect(checkLicense(mockLicenseInfo).test.showLinks).to.be(false);
        });

        it('should set management.jobTypes to undefined', () => {
          expect(checkLicense(mockLicenseInfo).management.jobTypes).to.be(undefined);
        });
      });
    });
  });
});
