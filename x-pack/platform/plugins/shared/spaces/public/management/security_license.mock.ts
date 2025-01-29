/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, type Observable } from 'rxjs';

import type { SecurityLicense } from '@kbn/security-plugin-types-public';

type SecurityLicenseFeatures = SecurityLicense['features$'] extends Observable<infer P> ? P : never;

export const createSecurityLicenseMock = ({
  securityFeaturesConfig,
}: {
  securityFeaturesConfig: SecurityLicenseFeatures;
}): SecurityLicense => {
  return {
    isLicenseAvailable: jest.fn(),
    isEnabled: jest.fn(),
    getFeatures: jest.fn(),
    getUnavailableReason: jest.fn(),
    hasAtLeast: jest.fn(),
    getLicenseType: jest.fn(),
    features$: new BehaviorSubject<SecurityLicenseFeatures>(securityFeaturesConfig),
  };
};

export const getSecurityLicenseMock = jest.fn().mockResolvedValue(
  createSecurityLicenseMock({
    securityFeaturesConfig: {
      showLinks: true,
      showLogin: true,
      allowLogin: true,
      allowRbac: true,
      allowFips: true,
      showRoleMappingsManagement: true,
      allowAccessAgreement: true,
      allowAuditLogging: true,
      allowSubFeaturePrivileges: true,
      allowRoleFieldLevelSecurity: true,
      allowRoleDocumentLevelSecurity: true,
      allowRoleRemoteIndexPrivileges: true,
      allowRemoteClusterPrivileges: true,
      allowUserProfileCollaboration: true,
    },
  })
);
