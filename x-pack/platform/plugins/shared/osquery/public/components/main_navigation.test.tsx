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
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { BehaviorSubject } from 'rxjs';

const OSQUERY_DOC_LINK = 'https://docs.elastic.co/solutions/security/investigate/osquery';

const DEFAULT_OSQUERY_CAPABILITIES = {
  readLiveQueries: true,
  writeLiveQueries: true,
  runSavedQueries: true,
  readSavedQueries: true,
  readPacks: true,
};
let mockOsqueryCapabilities: Record<string, boolean> = DEFAULT_OSQUERY_CAPABILITIES;

// --- Kibana services ---
jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        capabilities: {
          osquery: mockOsqueryCapabilities,
          navLinks: { integrations: true },
        },
        getUrlForApp: (appId: string, { path }: { path?: string } = {}) =>
          `/app/${appId}${path ?? ''}`,
        navigateToApp: jest.fn(),
      },
      docLinks: {
        links: {
          osquery: {
            guide: OSQUERY_DOC_LINK,
          },
        },
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

type MockChromeStart = ReturnType<typeof chromeServiceMock.createStartContract>;

const renderNavigation = (path: string, title?: string, chrome?: MockChromeStart) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <MockAppHeaderProvider chrome={chrome}>
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

// Registers a feedback handler so the built-in "Feedback" static menu item renders alongside our
// "Documentation" docLink item.
const createChromeWithFeedback = (): MockChromeStart => {
  const chrome = chromeServiceMock.createStartContract();
  (chrome.help.getFeedbackHandler$ as jest.Mock).mockReturnValue(new BehaviorSubject(() => {}));

  return chrome;
};

describe('MainNavigation', () => {
  beforeEach(() => {
    mockOsqueryCapabilities = DEFAULT_OSQUERY_CAPABILITIES;
  });

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

  it('should show Add integrations above the Feedback / Documentation divider, but not Manage integration', async () => {
    renderNavigation('/history', undefined, createChromeWithFeedback());

    await openAppMenuOverflow();
    const addIntegrations = screen.getByTestId('osqueryAddIntegrationsMenuItem');
    expect(addIntegrations).toHaveTextContent('Add integrations');
    expect(addIntegrations).toHaveAttribute('href', '/app/integrations/browse');
    expect(screen.getByTestId('appHeaderMenuDocumentation')).toHaveAttribute(
      'href',
      OSQUERY_DOC_LINK
    );
    expect(screen.getByTestId('appHeaderMenuFeedback')).toHaveTextContent('Feedback');

    // Page items come before the separator, the global Feedback / Documentation items after it.
    const menuOrder = Array.from(
      document.querySelectorAll(
        '[data-test-subj="osqueryAddIntegrationsMenuItem"], [role="separator"], [data-test-subj="appHeaderMenuFeedback"], [data-test-subj="appHeaderMenuDocumentation"]'
      )
    ).map((element) => element.getAttribute('data-test-subj') ?? element.getAttribute('role'));
    expect(menuOrder).toEqual([
      'osqueryAddIntegrationsMenuItem',
      'separator',
      'appHeaderMenuFeedback',
      'appHeaderMenuDocumentation',
    ]);

    expect(screen.queryByTestId('appHeaderMenuAddIntegrations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('osqueryManageIntegrationButton')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage integration')).not.toBeInTheDocument();
  });

  it('should render nothing on the live query details route (the page owns its own header)', () => {
    const { container } = renderNavigation('/history/abc-123');

    expect(container).toBeEmptyDOMElement();
  });

  it('should render nothing on the scheduled execution details route (the page owns its own header)', () => {
    const { container } = renderNavigation('/history/scheduled/abc-123/1');

    expect(container).toBeEmptyDOMElement();
  });

  it('should render a "Query results" header with History back on a results route the user cannot read', () => {
    mockOsqueryCapabilities = { ...DEFAULT_OSQUERY_CAPABILITIES, readLiveQueries: false };

    renderNavigation('/history/abc-123');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Query results');
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('aria-label', 'Back to History');
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

  it('should render the Create pack title and Packs back on /packs/add', () => {
    renderNavigation('/packs/add');

    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('Create pack');
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

  it.each([
    ['/new', undefined],
    ['/saved_queries/new', undefined],
    ['/saved_queries/e3f633ea-ae6e-41e1-908d-322bf774d4f0', 'Edit demo-query'],
    ['/packs/add', undefined],
    ['/packs/test-pack-id/edit', 'Edit demo-pack'],
  ])(
    'should show Add integrations, Feedback and Documentation on the %s subpage',
    async (path, title) => {
      renderNavigation(path, title, createChromeWithFeedback());

      await openAppMenuOverflow();
      expect(screen.getByTestId('osqueryAddIntegrationsMenuItem')).toHaveAttribute(
        'href',
        '/app/integrations/browse'
      );
      expect(screen.getByTestId('appHeaderMenuFeedback')).toHaveTextContent('Feedback');
      expect(screen.getByTestId('appHeaderMenuDocumentation')).toHaveAttribute(
        'href',
        OSQUERY_DOC_LINK
      );
      expect(screen.queryByTestId('osqueryRunQueryButton')).not.toBeInTheDocument();
    }
  );

  it.each(['/history', '/packs', '/saved_queries'])(
    'should render the tab strip on the %s list route',
    (path) => {
      renderNavigation(path);

      expect(screen.getAllByRole('tab')).toHaveLength(3);
    }
  );
});
