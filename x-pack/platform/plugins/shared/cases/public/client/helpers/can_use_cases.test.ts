/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import {
  allCasesCapabilities,
  allCasesPermissions,
  noCasesCapabilities,
  noCasesPermissions,
  readCasesPermissions,
  readCasesCapabilities,
  writeCasesCapabilities,
  writeCasesPermissions,
} from '../../common/mock';
import { canUseCases } from './can_use_cases';

type CasesCapabilities = Pick<
  ApplicationStart['capabilities'],
  'securitySolutionCasesV3' | 'observabilityCasesV3' | 'generalCasesV3'
>;

const hasAll: CasesCapabilities = {
  securitySolutionCasesV3: allCasesCapabilities(),
  observabilityCasesV3: allCasesCapabilities(),
  generalCasesV3: allCasesCapabilities(),
};

const hasNone: CasesCapabilities = {
  securitySolutionCasesV3: noCasesCapabilities(),
  observabilityCasesV3: noCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasSecurity: CasesCapabilities = {
  securitySolutionCasesV3: allCasesCapabilities(),
  observabilityCasesV3: noCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasObservability: CasesCapabilities = {
  securitySolutionCasesV3: noCasesCapabilities(),
  observabilityCasesV3: allCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasObservabilityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV3: noCasesCapabilities(),
  observabilityCasesV3: writeCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasSecurityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV3: writeCasesCapabilities(),
  observabilityCasesV3: noCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasObservabilityReadTrue: CasesCapabilities = {
  securitySolutionCasesV3: noCasesCapabilities(),
  observabilityCasesV3: readCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasSecurityReadTrue: CasesCapabilities = {
  securitySolutionCasesV3: readCasesCapabilities(),
  observabilityCasesV3: noCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasSecurityWriteAndObservabilityRead: CasesCapabilities = {
  securitySolutionCasesV3: writeCasesCapabilities(),
  observabilityCasesV3: readCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

const hasSecurityConnectors: CasesCapabilities = {
  securitySolutionCasesV3: readCasesCapabilities(),
  observabilityCasesV3: noCasesCapabilities(),
  generalCasesV3: noCasesCapabilities(),
};

describe('canUseCases', () => {
  it.each([hasAll, hasSecurity, hasObservability, hasSecurityWriteAndObservabilityRead])(
    'returns true for all permissions, if a user has access to both on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(allCasesPermissions());
    }
  );

  it.each([hasObservabilityWriteTrue, hasSecurityWriteTrue])(
    'returns true for only write, if a user has access to only write on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(writeCasesPermissions());
    }
  );

  it.each([hasObservabilityReadTrue, hasSecurityReadTrue])(
    'returns true for only read, if a user has access to only read on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(readCasesPermissions());
    }
  );

  it.each([hasNone, {}])(
    'returns false for all permissions, if a user has access to no solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(noCasesPermissions());
    }
  );

  it.each([hasSecurityConnectors])(
    'returns true for only connectors, if a user has access to only connectors on any solution',
    (capability) => {
      const permissions = canUseCases(capability)();
      expect(permissions).toStrictEqual(readCasesPermissions());
    }
  );
});
