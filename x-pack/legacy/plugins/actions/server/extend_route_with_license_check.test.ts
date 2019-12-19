/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { extendRouteWithLicenseCheck } from './extend_route_with_license_check';
import { LicenseState } from './lib/license_state';
jest.mock('./lib/license_state', () => ({
  verifyApiAccessFactory: () => {},
}));

describe('extendRouteWithLicenseCheck', () => {
  describe('#actionsextendRouteWithLicenseCheck', () => {
    let licenseState: jest.Mocked<LicenseState>;

    test('extends route object with license, if config property already exists', () => {
      const newRoute = extendRouteWithLicenseCheck(
        { config: { someTestProperty: 'test' } },
        licenseState
      );
      expect(newRoute.config.pre.length > 0);
    });
    test('extends route object with license check uder config.pro, if config property not exists', () => {
      const newRoute = extendRouteWithLicenseCheck(
        { options: { someProperty: 'test' } },
        licenseState
      );
      expect(newRoute.options.pre.length > 0);
    });
  });
});
