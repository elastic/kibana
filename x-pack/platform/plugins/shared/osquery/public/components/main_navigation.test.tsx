/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { MemoryRouter } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';

// --- Kibana services ---
jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: {
            writeLiveQueries: true,
            runSavedQueries: true,
            readSavedQueries: true,
            readPacks: true,
          },
        },
        getUrlForApp: () => '/app/integrations/osquery_manager/policies',
        navigateToApp: jest.fn(),
      },
    },
  }),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
  isModifiedEvent: () => false,
  isLeftClickEvent: () => true,
}));

jest.mock('../actions/history_filter_storage', () => ({
  getHistoryFilters: () => '',
}));

jest.mock('@kbn/fleet-plugin/public', () => ({
  pagePathGetters: {
    integration_details_policies: () => ['', '/integrations/osquery_manager/policies'],
  },
}));

import { MainNavigation } from './main_navigation';
import { OsqueryPageHeaderProvider, useOsquerySubpageTitle } from './osquery_page_header_context';

const PublishTitle = ({ title }: { title: string }) => {
  useOsquerySubpageTitle(title);

  return null;
};

const renderNavigation = (path: string, title?: string) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <MockAppHeaderProvider>
          <OsqueryPageHeaderProvider>
            <MemoryRouter initialEntries={[path]}>
              <MainNavigation />
              {title ? <PublishTitle title={title} /> : null}
            </MemoryRouter>
          </OsqueryPageHeaderProvider>
        </MockAppHeaderProvider>
      </IntlProvider>
    </EuiProvider>
  );

describe('MainNavigation', () => {
  it('should display History, Packs, and Queries tabs', () => {
    renderNavigation('/history');

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Packs')).toBeInTheDocument();
    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('href', 'history');
    expect(screen.getByRole('tab', { name: 'Packs' })).toHaveAttribute('href', 'packs');
    expect(screen.getByRole('tab', { name: 'Queries' })).toHaveAttribute('href', 'saved_queries');
  });

  it('does not call history.push when a tab is clicked', () => {
    const history = createMemoryHistory({ initialEntries: ['/history'] });
    const pushSpy = jest.spyOn(history, 'push');

    render(
      <EuiProvider>
        <IntlProvider locale="en">
          <MockAppHeaderProvider>
            <OsqueryPageHeaderProvider>
              <Router history={history}>
                <MainNavigation />
              </Router>
            </OsqueryPageHeaderProvider>
          </MockAppHeaderProvider>
        </IntlProvider>
      </EuiProvider>
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Packs' }));

    // Tabs are href-only. An extra history.push onClick is the double-entry bug.
    // The SPA interceptor is not in this unit test, so the signal is zero pushes.
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it('should show "Run query" as the primary action', () => {
    renderNavigation('/history');

    expect(screen.getByTestId('osqueryRunQueryButton')).toHaveTextContent('Run query');
  });

  it('should show "Manage integration" as a menu item', async () => {
    renderNavigation('/history');

    await openAppMenuOverflow();
    expect(screen.getByTestId('osqueryManageIntegrationButton')).toHaveTextContent(
      'Manage integration'
    );
  });

  it('should hide the tab strip and title on a details page', async () => {
    renderNavigation('/history/abc-123');

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByText('Osquery')).not.toBeInTheDocument();
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');

    await openAppMenuOverflow();
    expect(screen.getByTestId('osqueryManageIntegrationButton')).toBeInTheDocument();
  });

  it('should render the Run query title and History back on /new', () => {
    renderNavigation('/new');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Run query');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should render the Add saved query title and Queries back on /saved_queries/new', () => {
    renderNavigation('/saved_queries/new');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Add saved query');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to Queries');
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should render a Queries back button on a saved query details page', () => {
    renderNavigation('/saved_queries/e3f633ea-ae6e-41e1-908d-322bf774d4f0');

    expect(screen.getByTestId('appHeaderSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('appHeaderTitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to Queries');
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should render the Add pack title and Packs back on /packs/add', () => {
    renderNavigation('/packs/add');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Add pack');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to Packs');
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should render a Packs back button on a pack edit page', () => {
    renderNavigation('/packs/test-pack-id/edit');

    expect(screen.getByTestId('appHeaderSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('appHeaderTitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to Packs');
    expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('should replace the held title once the pack page publishes one', () => {
    renderNavigation('/packs/test-pack-id/edit', 'Edit demo-pack');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Edit demo-pack');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to Packs');
  });

  it.each(['/history', '/packs', '/saved_queries'])(
    'should render the tab strip on the %s list route',
    (path) => {
      renderNavigation(path);

      expect(screen.getAllByRole('tab')).toHaveLength(3);
    }
  );
});
