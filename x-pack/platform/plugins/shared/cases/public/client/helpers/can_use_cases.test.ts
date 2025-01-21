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
  'securitySolutionCasesV2' | 'observabilityCasesV2' | 'generalCasesV2'
>;

const hasAll: CasesCapabilities = {
  securitySolutionCasesV2: allCasesCapabilities(),
  observabilityCasesV2: allCasesCapabilities(),
  generalCasesV2: allCasesCapabilities(),
};

const hasNone: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCasesV2: noCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasSecurity: CasesCapabilities = {
  securitySolutionCasesV2: allCasesCapabilities(),
  observabilityCasesV2: noCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasObservability: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCasesV2: allCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasObservabilityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCasesV2: writeCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasSecurityWriteTrue: CasesCapabilities = {
  securitySolutionCasesV2: writeCasesCapabilities(),
  observabilityCasesV2: noCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasObservabilityReadTrue: CasesCapabilities = {
  securitySolutionCasesV2: noCasesCapabilities(),
  observabilityCasesV2: readCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasSecurityReadTrue: CasesCapabilities = {
  securitySolutionCasesV2: readCasesCapabilities(),
  observabilityCasesV2: noCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasSecurityWriteAndObservabilityRead: CasesCapabilities = {
  securitySolutionCasesV2: writeCasesCapabilities(),
  observabilityCasesV2: readCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
};

const hasSecurityConnectors: CasesCapabilities = {
  securitySolutionCasesV2: readCasesCapabilities(),
  observabilityCasesV2: noCasesCapabilities(),
  generalCasesV2: noCasesCapabilities(),
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
