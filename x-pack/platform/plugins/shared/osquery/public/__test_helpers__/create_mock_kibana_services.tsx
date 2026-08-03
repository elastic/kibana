/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MemoryRouter } from 'react-router-dom';

export interface OsqueryCapabilities {
  writeLiveQueries: boolean;
  runSavedQueries: boolean;
  readPacks: boolean;
  writePacks: boolean;
  readSavedQueries: boolean;
  writeSavedQueries: boolean;
}

const defaultCapabilities: OsqueryCapabilities = {
  writeLiveQueries: true,
  runSavedQueries: true,
  readPacks: true,
  writePacks: true,
  readSavedQueries: true,
  writeSavedQueries: true,
};

const readerCapabilities: OsqueryCapabilities = {
  writeLiveQueries: false,
  runSavedQueries: false,
  readPacks: true,
  writePacks: false,
  readSavedQueries: true,
  writeSavedQueries: false,
};

const t1AnalystCapabilities: OsqueryCapabilities = {
  writeLiveQueries: false,
  runSavedQueries: true,
  readPacks: true,
  writePacks: false,
  readSavedQueries: true,
  writeSavedQueries: false,
};

export const ROLE_CAPABILITIES = {
  admin: defaultCapabilities,
  reader: readerCapabilities,
  t1_analyst: t1AnalystCapabilities,
  t2_analyst: t1AnalystCapabilities,
} as const;

export interface MockKibanaServicesOptions {
  capabilities?: Partial<OsqueryCapabilities>;
}

export const createMockKibanaServices = (options: MockKibanaServicesOptions = {}) => {
  const osqueryCapabilities = {
    ...defaultCapabilities,
    ...options.capabilities,
  };

  return {
    appName: 'osquery',
    application: {
      getUrlForApp: jest.fn().mockReturnValue('/app/osquery'),
      navigateToApp: jest.fn(),
      navigateToUrl: jest.fn(),
      capabilities: {
        osquery: osqueryCapabilities,
        navLinks: {},
        management: {},
        catalogue: {},
      },
    },
    chrome: {
      setBreadcrumbs: jest.fn(),
      docTitle: { change: jest.fn(), reset: jest.fn() },
    },
    data: {
      fieldFormats: {},
      dataViews: { create: jest.fn().mockResolvedValue({}) },
    },
    notifications: {
      toasts: {
        addWarning: jest.fn(),
        addSuccess: jest.fn(),
        addError: jest.fn(),
        addDanger: jest.fn(),
      },
    },
    http: {
      basePath: { get: jest.fn().mockReturnValue(''), prepend: jest.fn((path: string) => path) },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      fetch: jest.fn(),
    },
    uiSettings: {
      get: jest.fn().mockReturnValue(false),
      get$: jest.fn(),
    },
    theme: {
      theme$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
    },
    analytics: {},
    i18n: {},
    uiActions: { getTriggerCompatibleActions: jest.fn().mockResolvedValue([]) },
    unifiedSearch: {
      ui: {
        SearchBar: jest.fn(() => null),
      },
    },
  };
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

const DEFAULT_INITIAL_ENTRIES = ['/'];

export const TestProvidersWithServices: React.FC<{
  children: React.ReactNode;
  services?: ReturnType<typeof createMockKibanaServices>;
  initialEntries?: string[];
}> = ({ children, services, initialEntries = DEFAULT_INITIAL_ENTRIES }) => {
  const kibanaServices = services ?? createMockKibanaServices();

  return (
    <EuiProvider>
      <IntlProvider locale="en">
        <KibanaContextProvider services={kibanaServices}>
          <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </IntlProvider>
    </EuiProvider>
  );
};
