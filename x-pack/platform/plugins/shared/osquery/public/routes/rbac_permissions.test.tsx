/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { OsqueryAppRoutes } from '.';
import { ExperimentalFeaturesProvider } from '../common/experimental_features_context';
import { allowedExperimentalValues } from '../../common/experimental_features';
import {
  ROLE_CAPABILITIES,
  type OsqueryCapabilities,
} from '../__test_helpers__/create_mock_kibana_services';

// Mocking useKibana at module level but allowing dynamic capabilities
let mockCapabilities: OsqueryCapabilities = ROLE_CAPABILITIES.admin;

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      appName: 'osquery',
      application: {
        getUrlForApp: jest.fn().mockReturnValue('/app/osquery'),
        navigateToApp: jest.fn(),
        capabilities: {
          osquery: mockCapabilities,
          navLinks: {},
          management: {},
          catalogue: {},
        },
      },
      chrome: {
        setBreadcrumbs: jest.fn(),
        docTitle: { change: jest.fn(), reset: jest.fn() },
      },
      http: {
        basePath: { get: jest.fn().mockReturnValue(''), prepend: jest.fn((p: string) => p) },
      },
      notifications: {
        toasts: { addWarning: jest.fn(), addSuccess: jest.fn(), addError: jest.fn() },
      },
      uiSettings: { get: jest.fn().mockReturnValue(false) },
    },
  }),
  useRouterNavigate: () => ({ href: '/app/osquery', onClick: jest.fn() }),
}));

jest.mock('../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

// Mock route components to avoid loading full trees
jest.mock('./live_queries', () => ({
  LiveQueries: () => <div data-test-subj="live-queries" />,
}));
jest.mock('./history', () => ({
  History: () => <div data-test-subj="history" />,
}));
jest.mock('./saved_queries', () => ({
  SavedQueries: () => <div data-test-subj="saved-queries" />,
}));
jest.mock('./packs', () => ({
  Packs: () => <div data-test-subj="packs" />,
}));
jest.mock('./live_queries/new', () => ({
  NewLiveQueryPage: () => <div data-test-subj="new-live-query" />,
}));
jest.mock('./components', () => ({
  MissingPrivileges: () => <div data-test-subj="missing-privileges">Permission denied</div>,
  NotFoundPage: () => <div data-test-subj="not-found" />,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderRoute = (path: string, capabilities: OsqueryCapabilities) => {
  mockCapabilities = capabilities;
  const features = { ...allowedExperimentalValues, queryHistoryRework: true };

  return render(
    <EuiProvider>
      <IntlProvider locale="en">
        <KibanaContextProvider
          services={{
            application: {
              getUrlForApp: jest.fn().mockReturnValue('/app/osquery'),
              capabilities: { osquery: capabilities },
            },
          }}
        >
          <QueryClientProvider client={createTestQueryClient()}>
            <ExperimentalFeaturesProvider value={features}>
              <MemoryRouter initialEntries={[path]}>
                <OsqueryAppRoutes />
              </MemoryRouter>
            </ExperimentalFeaturesProvider>
          </QueryClientProvider>
        </KibanaContextProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('RBAC permission checks in routes', () => {
  describe('reader role (read-only, no run or write)', () => {
    it('shows Permission denied on /new when lacking all write/run permissions', () => {
      renderRoute('/new', ROLE_CAPABILITIES.reader);
      expect(screen.getByTestId('missing-privileges')).toBeInTheDocument();
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });

    it('allows navigating to /history (read-only view)', () => {
      renderRoute('/history', ROLE_CAPABILITIES.reader);
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('allows navigating to /saved_queries (read-only view)', () => {
      renderRoute('/saved_queries', ROLE_CAPABILITIES.reader);
      expect(screen.getByTestId('saved-queries')).toBeInTheDocument();
    });

    it('allows navigating to /packs (read-only view)', () => {
      renderRoute('/packs', ROLE_CAPABILITIES.reader);
      expect(screen.getByTestId('packs')).toBeInTheDocument();
    });
  });

  describe('t1_analyst role (read + runSavedQueries)', () => {
    it('allows access to /new when user can run saved queries', () => {
      renderRoute('/new', ROLE_CAPABILITIES.t1_analyst);
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('allows navigating to /saved_queries', () => {
      renderRoute('/saved_queries', ROLE_CAPABILITIES.t1_analyst);
      expect(screen.getByTestId('saved-queries')).toBeInTheDocument();
    });
  });

  describe('admin role (full permissions)', () => {
    it('allows access to /new', () => {
      renderRoute('/new', ROLE_CAPABILITIES.admin);
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });
  });
});
