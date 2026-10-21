/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { EuiProvider } from '@elastic/eui';

import { OsqueryAppRoutes } from '.';
import { ExperimentalFeaturesProvider } from '../common/experimental_features_context';
import { allowedExperimentalValues } from '../../common/experimental_features';

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
            readLiveQueries: true,
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

// Mock the leaf pages rather than the `./history` sub-router, so that the real sub-router runs
// and multi-hop redirects (e.g. `/live_queries/new` -> `/history/new` -> `/new`) are observed.
jest.mock('./history/list', () => ({ HistoryPage: () => <div data-test-subj="history" /> }));
jest.mock('./history/scheduled_execution_details', () => ({
  ScheduledExecutionDetailsPage: () => <div data-test-subj="scheduled-execution-details" />,
}));
jest.mock('./live_queries/details', () => ({
  LiveQueryDetailsPage: () => <div data-test-subj="live-query-details" />,
}));
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

// Records the router's resolved location so redirect targets (path + search + hash)
// can be asserted even though the destination page components are mocked out.
const LocationSpy = ({ onLocation }: { onLocation: (location: string) => void }) => {
  const location = useLocation();
  onLocation(location.pathname + location.search + location.hash);

  return null;
};

const renderWithRouter = (path: string, onLocation: (location: string) => void = () => {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <QueryClientProvider client={createTestQueryClient()}>
          <ExperimentalFeaturesProvider value={allowedExperimentalValues}>
            <MemoryRouter initialEntries={[path]}>
              <Route path="*">
                <LocationSpy onLocation={onLocation} />
              </Route>
              <OsqueryAppRoutes />
            </MemoryRouter>
          </ExperimentalFeaturesProvider>
        </QueryClientProvider>
      </IntlProvider>
    </EuiProvider>
  );

const resolveLocation = (path: string) => {
  let resolved = '';
  renderWithRouter(path, (location) => {
    resolved = location;
  });

  return resolved;
};

describe('OsqueryAppRoutes', () => {
  it('redirects root path to /history', () => {
    renderWithRouter('/');
    expect(screen.getByTestId('history')).toBeInTheDocument();
  });

  it('redirects /live_queries to /history', () => {
    renderWithRouter('/live_queries');
    expect(screen.getByTestId('history')).toBeInTheDocument();
  });

  describe('legacy /live_queries redirects', () => {
    it('maps /live_queries/new to the top-level /new page', () => {
      expect(resolveLocation('/live_queries/new')).toBe('/new');
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('preserves the action id on a live query deep link', () => {
      expect(resolveLocation('/live_queries/abc-123')).toBe('/history/abc-123');
      expect(screen.getByTestId('live-query-details')).toBeInTheDocument();
    });

    it('preserves the query string when redirecting', () => {
      expect(resolveLocation('/live_queries?kuery=foo')).toBe('/history?kuery=foo');
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('preserves the query string and hash on a deep link', () => {
      expect(resolveLocation('/live_queries/abc-123?tab=results#top')).toBe(
        '/history/abc-123?tab=results#top'
      );
      expect(screen.getByTestId('live-query-details')).toBeInTheDocument();
    });

    it('preserves the query string when redirecting /live_queries/new', () => {
      expect(resolveLocation('/live_queries/new?packId=pack-1')).toBe('/new?packId=pack-1');
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('maps a trailing-slash /live_queries/new/ to the top-level /new page', () => {
      expect(resolveLocation('/live_queries/new/')).toBe('/new');
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('preserves the query string and hash on a trailing-slash /live_queries/new/', () => {
      expect(resolveLocation('/live_queries/new/?packId=pack-1#hash')).toBe(
        '/new?packId=pack-1#hash'
      );
      expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
    });

    it('maps a trailing-slash /live_queries/ to the history page', () => {
      expect(resolveLocation('/live_queries/')).toBe('/history');
      expect(screen.getByTestId('history')).toBeInTheDocument();
    });

    it('maps a nested scheduled execution deep link', () => {
      expect(resolveLocation('/live_queries/scheduled/schedule-1/2')).toBe(
        '/history/scheduled/schedule-1/2'
      );
      expect(screen.getByTestId('scheduled-execution-details')).toBeInTheDocument();
    });

    it('maps a mixed-case legacy path onto its history equivalent', () => {
      expect(resolveLocation('/LIVE_QUERIES/abc-123')).toBe('/history/abc-123');
      expect(screen.getByTestId('live-query-details')).toBeInTheDocument();
    });
  });

  it('redirects /history/new to /new, preserving the query string and hash', () => {
    // Hits the History sub-router's redirect; /live_queries/new maps straight to /new.
    expect(resolveLocation('/history/new?packId=pack-1#top')).toBe('/new?packId=pack-1#top');
    expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
  });

  it('renders history page at /history', () => {
    renderWithRouter('/history');
    expect(screen.getByTestId('history')).toBeInTheDocument();
  });

  it('renders new live query form at /new', () => {
    renderWithRouter('/new');
    expect(screen.getByTestId('new-live-query')).toBeInTheDocument();
  });

  it('renders saved queries at /saved_queries', () => {
    renderWithRouter('/saved_queries');
    expect(screen.getByTestId('saved-queries')).toBeInTheDocument();
  });

  it('renders packs at /packs', () => {
    renderWithRouter('/packs');
    expect(screen.getByTestId('packs')).toBeInTheDocument();
  });
});
