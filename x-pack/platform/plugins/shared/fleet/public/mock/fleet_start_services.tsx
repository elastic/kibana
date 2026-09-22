/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { MockedKeys } from '@kbn/utility-types-jest';

import { coreMock } from '@kbn/core/public/mocks';
import type { IStorage } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import { setHttpClient } from '../hooks/use_request';

import type { FleetAuthz } from '../../common';

import { createStartDepsMock, createSetupDepsMock } from './plugin_dependencies';
import type { MockedFleetStartServices } from './types';

// Taken from core. See: src/plugins/kibana_utils/public/storage/storage.test.ts
const createMockStore = (): MockedKeys<IStorage> => {
  let store: Record<string, any> = {};
  return {
    getItem: jest.fn().mockImplementation((key) => store[key]),
    setItem: jest.fn().mockImplementation((key, value) => (store[key] = value)),
    removeItem: jest.fn().mockImplementation((key: string) => delete store[key]),
    clear: jest.fn().mockImplementation(() => (store = {})),
  };
};

const fleetAuthzMock: FleetAuthz = {
  fleet: {
    all: true,
    setup: true,
    readEnrollmentTokens: true,
    readAgentPolicies: true,
    readAgents: true,
    readSettings: true,
    allAgentPolicies: true,
    allAgents: true,
    allSettings: true,
    addAgents: true,
    addFleetServers: true,
    generateAgentReports: true,
  },
  integrations: {
    all: true,
    readPackageInfo: true,
    readInstalledPackages: true,
    installPackages: true,
    upgradePackages: true,
    uploadPackages: true,
    removePackages: true,
    readPackageSettings: true,
    writePackageSettings: true,
    readIntegrationPolicies: true,
    writeIntegrationPolicies: true,
  },
};

const configureStartServices = (services: MockedFleetStartServices): void => {
  // Store the http for use by useRequest
  setHttpClient(services.http);

  // Set Fleet and Integrations capabilities
  services.application.capabilities = {
    ...services.application.capabilities,
    // Fleet
    fleetv2: {
      read: true,
      all: true,
    },
    // Integration
    fleet: {
      read: true,
      all: true,
    },
  };

  // Setup the `i18n.Context` component
  services.i18n.Context.mockImplementation(({ children }: { children: React.ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  ));
};

export const createStartServices = (basePath: string = '/mock'): MockedFleetStartServices => {
  const { cloud: cloudStart, ...startDeps } = createStartDepsMock();
  const { cloud: cloudSetup } = createSetupDepsMock();

  const startServices: MockedFleetStartServices = {
    ...coreMock.createStart({ basePath }),
    ...startDeps,
    cloud: {
      ...cloudStart,
      ...cloudSetup,
    },
    dashboard: {} as unknown as MockedFleetStartServices['dashboard'],
    storage: new Storage(createMockStore()) as jest.Mocked<Storage>,
    authz: fleetAuthzMock,
  };

  configureStartServices(startServices);

  return startServices;
};
