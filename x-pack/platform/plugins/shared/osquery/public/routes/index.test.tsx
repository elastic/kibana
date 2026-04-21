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

import { OsqueryAppRoutes } from '.';
import { ExperimentalFeaturesProvider } from '../common/experimental_features_context';
import {
  allowedExperimentalValues,
  type ExperimentalFeatures,
} from '../../common/experimental_features';

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      appName: 'osquery',
      application: {
        getUrlForApp: jest.fn().mockReturnValue('/app/osquery'),
        navigateToApp: jest.fn(),
        capabilities: {
          osquery: {
            writeLiveQueries: true,
            runSavedQueries: true,
            readPacks: true,
            writePacks: true,
            readSavedQueries: true,
            writeSavedQueries: true,
          },
        },
      },
      chrome: {
        setBreadcrumbs: jest.fn(),
        docTitle: { change: jest.fn(), reset: jest.fn() },
      },
      http: {
        basePath: { get: jest.fn().mockReturnValue(''), prepend: jest.fn((p: string) => p) },
      },
      notifications: { toasts: { addWarning: jest.fn(), addError: jest.fn() } },
      uiSettings: { get: jest.fn().mockReturnValue(false) },
    },
  }),
}));

jest.mock('../common/hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

// Mock lazy-loaded route components to avoid loading full component trees
jest.mock('./live_queries', () => ({ LiveQueries: () => <div data-test-subj="live-queries" /> }));
jest.mock('./history', () => ({ History: () => <div data-test-subj="history" /> }));
jest.mock('./saved_queries', () => ({
  SavedQueries: () => <div data-test-subj="saved-queries" />,
}));
jest.mock('./packs', () => ({ Packs: () => <div data-test-subj="packs" /> }));
jest.mock('./live_queries/new', () => ({
  NewLiveQueryPage: () => <div data-test-subj="new-live-query" />,
}));
jest.mock('./components', () => ({
  MissingPrivileges: () => <div data-test-subj="missing-privileges" />,
  NotFoundPage: () => <div data-test-subj="not-found" />,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0 } } });

const renderWithRouter = (
  path: string,
  experimentalFeatures: Partial<ExperimentalFeatures> = {}
) => {
  const features = { ...allowedExperimentalValues, ...experimentalFeatures };

  return render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <ExperimentalFeaturesProvider value={features}>
            <MemoryRouter initialEntries={[path]}>
              <OsqueryAppRoutes />
            </MemoryRouter>
          </ExperimentalFeaturesProvider>
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );
};

describe('OsqueryAppRoutes', () => {
  describe('with queryHistoryRework enabled', () => {
    const featureFlags = { queryHistoryRework: true };

    it('redirects root path to /history', () => {
      renderWithRouter('/', featureFlags);
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('redirects /live_queries to /history', () => {
      renderWithRouter('/live_queries', featureFlags);
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('renders history page at /history', () => {
      renderWithRouter('/history', featureFlags);
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('renders new live query form at /new', () => {
      renderWithRouter('/new', featureFlags);
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('renders saved queries at /saved_queries', () => {
      renderWithRouter('/saved_queries', featureFlags);
      expect(screen.getByTestId('saved-queries')).toBeInTheDocument();
    });

    it('renders packs at /packs', () => {
      renderWithRouter('/packs', featureFlags);
      expect(screen.getByTestId('packs')).toBeInTheDocument();
    });
  });

  describe('with queryHistoryRework disabled', () => {
    const featureFlags = { queryHistoryRework: false };

    it('redirects root path to /live_queries', () => {
      renderWithRouter('/', featureFlags);
      expect(screen.getByTestId('live-queries')).toBeInTheDocument();
    });

    it('renders live queries at /live_queries', () => {
      renderWithRouter('/live_queries', featureFlags);
      expect(screen.getByTestId('live-queries')).toBeInTheDocument();
    });

    it('renders saved queries at /saved_queries', () => {
      renderWithRouter('/saved_queries', featureFlags);
      expect(screen.getByTestId('saved-queries')).toBeInTheDocument();
    });

    it('renders packs at /packs', () => {
      renderWithRouter('/packs', featureFlags);
      expect(screen.getByTestId('packs')).toBeInTheDocument();
    });
  });
});
