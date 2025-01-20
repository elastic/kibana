/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import { TRANSFORM_PLUGIN_ID } from './constants/plugin';

import {
  calculateEndpointExceptionsPrivilegesFromCapabilities,
  calculateEndpointExceptionsPrivilegesFromKibanaPrivileges,
  calculatePackagePrivilegesFromCapabilities,
  calculatePackagePrivilegesFromKibanaPrivileges,
  getAuthorizationFromPrivileges,
} from './authz';
import { ENDPOINT_PRIVILEGES } from './constants';

const SECURITY_SOLUTION_ID = DEFAULT_APP_CATEGORIES.security.id;

function generateActions<T>(privileges: T, overrides: Record<string, boolean> = {}) {
  return Object.keys(privileges as any).reduce((acc, privilege) => {
    const executePackageAction = overrides[privilege] || false;

    return {
      ...acc,
      [privilege]: {
        executePackageAction,
      },
    };
  }, {});
}

describe('fleet authz', () => {
  describe('calculatePackagePrivilegesFromCapabilities', () => {
    it('calculates privileges correctly', () => {
      const endpointCapabilities = {
        writeEndpointList: true,
        writeTrustedApplications: true,
        writePolicyManagement: false,
        readPolicyManagement: true,
        writeHostIsolationExceptions: true,
        writeHostIsolation: false,
      };

      const transformCapabilities = {
        canCreateTransform: false,
        canDeleteTransform: false,
        canGetTransform: true,
        canStartStopTransform: false,
      };

      const expected = {
        endpoint: {
          actions: generateActions(ENDPOINT_PRIVILEGES, endpointCapabilities),
        },
        transform: {
          actions: {
            canCreateTransform: { executePackageAction: false },
            canDeleteTransform: { executePackageAction: false },
            canGetTransform: { executePackageAction: true },
            canStartStopTransform: { executePackageAction: false },
          },
        },
      };
      const actual = calculatePackagePrivilegesFromCapabilities({
        navLinks: {},
        management: {},
        catalogue: {},
        siemV2: endpointCapabilities,
        transform: transformCapabilities,
      });

      expect(actual).toEqual(expected);
    });
  });

  describe('#calculateEndpointExceptionsPrivilegesFromCapabilities', () => {
    it('calculates endpoint exceptions privileges correctly', () => {
      const endpointExceptionsCapabilities = {
        showEndpointExceptions: false,
        crudEndpointExceptions: true,
      };

      const expected = {
        actions: {
          showEndpointExceptions: false,
          crudEndpointExceptions: true,
        },
      };

      const actual = calculateEndpointExceptionsPrivilegesFromCapabilities({
        navLinks: {},
        management: {},
        catalogue: {},
        siemV2: endpointExceptionsCapabilities,
      });

      expect(actual).toEqual(expected);
    });

    it('calculates endpoint exceptions privileges correctly when no matching capabilities', () => {
      const endpointCapabilities = {
        writeEndpointList: true,
        writeTrustedApplications: true,
        writePolicyManagement: false,
        readPolicyManagement: true,
        writeHostIsolationExceptions: true,
        writeHostIsolation: false,
      };
      const expected = {
        actions: {
          showEndpointExceptions: false,
          crudEndpointExceptions: false,
        },
      };
      const actual = calculateEndpointExceptionsPrivilegesFromCapabilities({
        navLinks: {},
        management: {},
        catalogue: {},
        siemV2: endpointCapabilities,
      });

      expect(actual).toEqual(expected);
    });
  });

  describe('calculatePackagePrivilegesFromKibanaPrivileges', () => {
    it('calculates privileges correctly', () => {
      const endpointPrivileges = [
        { privilege: `${SECURITY_SOLUTION_ID}-writeEndpointList`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeTrustedApplications`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writePolicyManagement`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-readPolicyManagement`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolationExceptions`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolation`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: true },
        { privilege: `${TRANSFORM_PLUGIN_ID}-admin`, authorized: true },
        { privilege: `${TRANSFORM_PLUGIN_ID}-read`, authorized: true },
      ];
      const expected = {
        endpoint: {
          actions: generateActions(ENDPOINT_PRIVILEGES, {
            writeEndpointList: true,
            writeTrustedApplications: true,
            writePolicyManagement: false,
            readPolicyManagement: true,
            writeHostIsolationExceptions: true,
            writeHostIsolation: false,
          }),
        },
        transform: {
          actions: {
            canCreateTransform: { executePackageAction: true },
            canDeleteTransform: { executePackageAction: true },
            canGetTransform: { executePackageAction: true },
            canStartStopTransform: { executePackageAction: true },
          },
        },
      };
      const actual = calculatePackagePrivilegesFromKibanaPrivileges(endpointPrivileges);
      expect(actual).toEqual(expected);
    });
  });

  describe('#calculateEndpointExceptionsPrivilegesFromKibanaPrivileges', () => {
    it('calculates endpoint exceptions privileges correctly', () => {
      const endpointExceptionsPrivileges = [
        { privilege: `${SECURITY_SOLUTION_ID}-showEndpointExceptions`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-crudEndpointExceptions`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: true },
      ];
      const expected = {
        actions: {
          showEndpointExceptions: true,
          crudEndpointExceptions: false,
        },
      };
      const actual = calculateEndpointExceptionsPrivilegesFromKibanaPrivileges(
        endpointExceptionsPrivileges
      );
      expect(actual).toEqual(expected);
    });
  });

  describe('#getAuthorizationFromPrivileges', () => {
    it('returns `false` when no `prefix` nor `searchPrivilege`', () => {
      expect(
        getAuthorizationFromPrivileges({
          kibanaPrivileges: [
            {
              privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`,
              authorized: true,
            },
          ],
        })
      ).toEqual(false);
    });

    it('returns correct Boolean when `prefix` and `searchPrivilege` are given', () => {
      const kibanaPrivileges = [
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolationExceptions`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolation`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: false },
      ];

      expect(
        getAuthorizationFromPrivileges({
          kibanaPrivileges,
          prefix: `${SECURITY_SOLUTION_ID}-`,
          searchPrivilege: `writeHostIsolation`,
        })
      ).toEqual(true);
    });

    it('returns correct Boolean when only `prefix` is given', () => {
      const kibanaPrivileges = [
        { privilege: `ignore-me-writeHostIsolationExceptions`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolation`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: false },
      ];

      expect(
        getAuthorizationFromPrivileges({
          kibanaPrivileges,
          prefix: `${SECURITY_SOLUTION_ID}-`,
          searchPrivilege: `writeHostIsolation`,
        })
      ).toEqual(true);
    });

    it('returns correct Boolean when only `searchPrivilege` is given', () => {
      const kibanaPrivileges = [
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolationExceptions`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolation`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: false },
      ];

      expect(
        getAuthorizationFromPrivileges({
          kibanaPrivileges,
          searchPrivilege: `writeHostIsolation`,
        })
      ).toEqual(true);
    });
  });
});
