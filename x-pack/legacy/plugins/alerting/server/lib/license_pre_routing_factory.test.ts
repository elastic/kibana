/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { licensePreRoutingFactory } from './license_pre_routing_factory';
import { LICENSE_STATUS_VALID, LICENSE_STATUS_INVALID } from '../../../../common/constants';

describe('license_pre_routing_factory', () => {
  describe('#actionsFeaturePreRoutingFactory', () => {
    let mockServer: any;
    let mockLicenseCheckResults: any;

    beforeEach(() => {
      mockServer = {
        plugins: {
          xpack_main: {
            info: {
              feature: () => ({
                getLicenseCheckResults: () => mockLicenseCheckResults,
              }),
            },
          },
        },
      };
    });

    describe('status is LICENSE_STATUS_INVALID', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: LICENSE_STATUS_INVALID,
        };
      });

      it('replies with 403', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer.plugins);
        expect(() => licensePreRouting()).to.throwException(response => {
          expect(response).to.be.an(Error);
          expect(response.isBoom).to.be(true);
          expect(response.output.statusCode).to.be(403);
        });
      });
    });

    describe('status is LICENSE_STATUS_VALID', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: LICENSE_STATUS_VALID,
        };
      });

      it('replies with nothing', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer.plugins);
        const response = licensePreRouting();
        expect(response).to.be(null);
      });
    });
  });
});
