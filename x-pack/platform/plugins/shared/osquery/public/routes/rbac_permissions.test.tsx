/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

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

vi.mock('../common/lib/kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          appName: 'osquery',
          application: {
            getUrlForApp: vi.fn().mockReturnValue('/app/osquery'),
            navigateToApp: vi.fn(),
            capabilities: {
              osquery: mockCapabilities,
              navLinks: {},
              management: {},
              catalogue: {},
            },
          },
          chrome: {
            setBreadcrumbs: vi.fn(),
            docTitle: { change: vi.fn(), reset: vi.fn() },
          },
          http: {
            basePath: { get: vi.fn().mockReturnValue(''), prepend: vi.fn((p: string) => p) },
          },
          notifications: {
            toasts: { addWarning: vi.fn(), addSuccess: vi.fn(), addError: vi.fn() },
          },
          uiSettings: { get: vi.fn().mockReturnValue(false) },
        },
      }),
      useRouterNavigate: () => ({ href: '/app/osquery', onClick: vi.fn() }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../common/hooks/use_breadcrumbs', () => {
      const mocked = {
      useBreadcrumbs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// Mock route components to avoid loading full trees
vi.mock('./history', () => {
      const mocked = {
      History: () => <div data-test-subj="history" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./saved_queries', () => {
      const mocked = {
      SavedQueries: () => <div data-test-subj="saved-queries" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./packs', () => {
      const mocked = {
      Packs: () => <div data-test-subj="packs" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./live_queries/new', () => {
      const mocked = {
      NewLiveQueryPage: () => <div data-test-subj="new-live-query" />,
    };
      return { ...mocked, default: mocked };
    });
vi.mock('./components', () => {
      const mocked = {
      MissingPrivileges: () => <div data-test-subj="missing-privileges">Permission denied</div>,
      NotFoundPage: () => <div data-test-subj="not-found" />,
    };
      return { ...mocked, default: mocked };
    });

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderRoute = (path: string, capabilities: OsqueryCapabilities) => {
  mockCapabilities = capabilities;
  const features = { ...allowedExperimentalValues };

  return render(
    <EuiProvider>
      <IntlProvider locale="en">
        <KibanaContextProvider
          services={{
            application: {
              getUrlForApp: vi.fn().mockReturnValue('/app/osquery'),
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
