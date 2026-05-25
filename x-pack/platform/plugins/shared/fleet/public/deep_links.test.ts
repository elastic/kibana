/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allowedExperimentalValues } from '../common/experimental_features';
import type { FleetAuthz } from '../common';

import { getFleetDeepLinks, FleetDeepLinkId } from './deep_links';

const authorizedAuthz: FleetAuthz = {
  fleet: {
    all: true,
    setup: true,
    readEnrollmentTokens: true,
    readAgentPolicies: true,
    allAgentPolicies: true,
    readAgents: true,
    allAgents: true,
    readSettings: true,
    allSettings: true,
    generateAgentReports: true,
    addAgents: true,
    addFleetServers: true,
  },
  integrations: {
    all: true,
    readPackageInfo: true,
    readInstalledPackages: true,
    installPackages: true,
    upgradePackages: true,
    removePackages: true,
    uploadPackages: true,
    readPackageSettings: true,
    writePackageSettings: true,
    readIntegrationPolicies: true,
    writeIntegrationPolicies: true,
  },
};

const unauthorizedAuthz: FleetAuthz = {
  fleet: {
    all: false,
    setup: false,
    readEnrollmentTokens: false,
    readAgentPolicies: false,
    allAgentPolicies: false,
    readAgents: false,
    allAgents: false,
    readSettings: false,
    allSettings: false,
    generateAgentReports: false,
    addAgents: false,
    addFleetServers: false,
  },
  integrations: {
    all: false,
    readPackageInfo: false,
    readInstalledPackages: false,
    installPackages: false,
    upgradePackages: false,
    removePackages: false,
    uploadPackages: false,
    readPackageSettings: false,
    writePackageSettings: false,
    readIntegrationPolicies: false,
    writeIntegrationPolicies: false,
  },
};

const authzGatedIds = [
  FleetDeepLinkId.agents,
  FleetDeepLinkId.policies,
  FleetDeepLinkId.enrollmentTokens,
  FleetDeepLinkId.uninstallTokens,
  FleetDeepLinkId.settings,
];

describe('getFleetDeepLinks', () => {
  it('includes solutionSideNav in visibleIn for all authz-gated links when authorized', () => {
    const links = getFleetDeepLinks(allowedExperimentalValues, authorizedAuthz);
    for (const id of authzGatedIds) {
      expect(links.find((l) => l.id === id)?.visibleIn).toEqual([
        'globalSearch',
        'solutionSideNav',
      ]);
    }
  });

  it('returns empty visibleIn for all authz-gated links when unauthorized', () => {
    const links = getFleetDeepLinks(allowedExperimentalValues, unauthorizedAuthz);
    for (const id of authzGatedIds) {
      expect(links.find((l) => l.id === id)?.visibleIn).toEqual([]);
    }
  });

  it('returns empty visibleIn for all authz-gated links when authz is undefined', () => {
    const links = getFleetDeepLinks(allowedExperimentalValues, undefined);
    for (const id of authzGatedIds) {
      expect(links.find((l) => l.id === id)?.visibleIn).toEqual([]);
    }
  });

  it('dataStreams link has no visibleIn restriction', () => {
    const links = getFleetDeepLinks(allowedExperimentalValues, undefined);
    expect(links.find((l) => l.id === FleetDeepLinkId.dataStreams)?.visibleIn).toBeUndefined();
  });
});
