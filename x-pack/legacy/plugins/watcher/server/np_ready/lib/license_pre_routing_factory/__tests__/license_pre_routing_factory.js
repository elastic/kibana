/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kibanaResponseFactory } from '../../../../../../../../../src/core/server';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';
import {
  LICENSE_STATUS_VALID,
  LICENSE_STATUS_EXPIRED,
} from '../../../../../../../common/constants/license_status';

describe('license_pre_routing_factory', () => {
  describe('#reportingFeaturePreRoutingFactory', () => {
    let mockServer;
    let mockLicenseCheckResults;

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

    describe('status is not valid', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: LICENSE_STATUS_EXPIRED,
        };
      });

      it('replies with 403', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer, () => {});
        const stubRequest = {};
        const response = licensePreRouting({}, stubRequest, kibanaResponseFactory);
        expect(response.status).to.be(403);
      });
    });

    describe('status is valid', () => {
      beforeEach(() => {
        mockLicenseCheckResults = {
          status: LICENSE_STATUS_VALID,
        };
      });

      it('replies with nothing', () => {
        const licensePreRouting = licensePreRoutingFactory(mockServer, () => null);
        const stubRequest = {};
        const response = licensePreRouting({}, stubRequest, kibanaResponseFactory);
        expect(response).to.be(null);
      });
    });
  });
});
