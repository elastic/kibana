/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { set } from 'lodash';
import { XPackInfo } from '../../../../xpack_main/server/lib/xpack_info';
import { checkLicense } from './check_license';

describe('check_license', () => {
  let mockLicenseInfo: XPackInfo;
  beforeEach(() => (mockLicenseInfo = {} as XPackInfo));

  describe('license information is undefined', () => {
    it('should set isAvailable to false', () => {
      expect(checkLicense(undefined as any).isAvailable).to.be(false);
    });

    it('should set showLinks to true', () => {
      expect(checkLicense(undefined as any).showLinks).to.be(true);
    });

    it('should set enableLinks to false', () => {
      expect(checkLicense(undefined as any).enableLinks).to.be(false);
    });

    it('should set a message', () => {
      expect(checkLicense(undefined as any).message).to.not.be(undefined);
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

    describe('& ML is disabled in Elasticsearch', () => {
      beforeEach(() => {
        set(
          mockLicenseInfo,
          'feature',
          sinon
            .stub()
            .withArgs('ml')
            .returns({ isEnabled: () => false })
        );
      });

      it('should set showLinks to false', () => {
        expect(checkLicense(mockLicenseInfo).showLinks).to.be(false);
      });

      it('should set isAvailable to false', () => {
        expect(checkLicense(mockLicenseInfo).isAvailable).to.be(false);
      });

      it('should set enableLinks to false', () => {
        expect(checkLicense(mockLicenseInfo).enableLinks).to.be(false);
      });

      it('should set a message', () => {
        expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
      });
    });

    describe('& ML is enabled in Elasticsearch', () => {
      beforeEach(() => {
        set(
          mockLicenseInfo,
          'feature',
          sinon
            .stub()
            .withArgs('ml')
            .returns({ isEnabled: () => true })
        );
      });

      describe('& license is >= platinum', () => {
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

          it('should set isAvailable to true', () => {
            expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
          });

          it('should set showLinks to true', () => {
            expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
          });

          it('should set enableLinks to true', () => {
            expect(checkLicense(mockLicenseInfo).enableLinks).to.be(true);
          });

          it('should set a message', () => {
            expect(checkLicense(mockLicenseInfo).message).to.not.be(undefined);
          });
        });
      });

      describe('& license is basic', () => {
        beforeEach(() => set(mockLicenseInfo, 'license.isOneOf', () => false));

        describe('& license is active', () => {
          beforeEach(() => set(mockLicenseInfo, 'license.isActive', () => true));

          it('should set isAvailable to true', () => {
            expect(checkLicense(mockLicenseInfo).isAvailable).to.be(true);
          });

          it('should set showLinks to true', () => {
            expect(checkLicense(mockLicenseInfo).showLinks).to.be(true);
          });
        });
      });
    });
  });
});
