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
import { EuiProvider } from '@elastic/eui';

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
      },
    },
  }),
  useRouterNavigate: (path: string) => ({ onClick: jest.fn(), href: path }),
  isModifiedEvent: () => false,
  isLeftClickEvent: () => true,
}));

// --- Heavy dependency stubs ---
jest.mock('./manage_integration_link', () => ({
  ManageIntegrationLink: () => null,
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

const renderNavigation = (path: string) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <MemoryRouter initialEntries={[path]}>
          <MainNavigation />
        </MemoryRouter>
      </IntlProvider>
    </EuiProvider>
  );

describe('MainNavigation', () => {
  it('should display History, Packs, and Queries tabs', () => {
    renderNavigation('/history');

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Packs')).toBeInTheDocument();
    expect(screen.getByText('Queries')).toBeInTheDocument();
    expect(screen.queryByText('Live queries')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved queries')).not.toBeInTheDocument();
  });

  it('should show "Run query" button', () => {
    renderNavigation('/history');

    expect(screen.getByText('Run query')).toBeInTheDocument();
  });
});
