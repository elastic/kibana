/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { licensePreRoutingFactory } from '.';
import {
  LICENSE_STATUS_VALID,
  LICENSE_STATUS_INVALID,
} from '../../../../../common/constants/license_status';
import { kibanaResponseFactory } from '../../../../../../../src/core/server';

describe('licensePreRoutingFactory()', () => {
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

  describe('status is invalid', () => {
    beforeEach(() => {
      mockLicenseCheckResults = {
        status: LICENSE_STATUS_INVALID,
      };
    });

    it('replies with 403', () => {
      const routeWithLicenseCheck = licensePreRoutingFactory(mockServer, () => {});
      const stubRequest = {};
      const response = routeWithLicenseCheck({}, stubRequest, kibanaResponseFactory);
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
      const routeWithLicenseCheck = licensePreRoutingFactory(mockServer, () => null);
      const stubRequest = {};
      const response = routeWithLicenseCheck({}, stubRequest, kibanaResponseFactory);
      expect(response).to.be(null);
    });
  });
});
