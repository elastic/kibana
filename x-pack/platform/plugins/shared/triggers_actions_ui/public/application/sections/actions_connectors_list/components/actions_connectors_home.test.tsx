/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { RouteComponentProps } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMemoryHistory, createLocation } from 'history';
import ActionsConnectorsHome, { MatchParams } from './actions_connectors_home';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
}));
const { loadAllActions } = jest.requireMock('../../../lib/action_connector_api');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/capabilities');
jest.mock('../../../../common/get_experimental_features');
jest.mock('../../../components/health_check', () => ({
  HealthCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../context/health_context', () => ({
  HealthContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./actions_connectors_list', () => {
  return () => (
    <div data-test-subj="actionsConnectorsListComponent">
      {'Render Actions connectors list component'}
    </div>
  );
});
jest.mock('./actions_connectors_event_log_list_table', () => {
  return () => (
    <div data-test-subj="connectorEventLogListTableComponent">
      {'Render Connector Event log list table component'}
    </div>
  );
});

const queryClient = new QueryClient();

describe('ActionsConnectorsHome', () => {
  it('renders Actions connectors list component', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/connectors'],
      }),
      location: createLocation('/connectors'),
      match: {
        isExact: true,
        path: '/connectors',
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    expect(loadAllActions).toHaveBeenCalled();
    expect(await screen.findByTestId('actionsConnectorsListComponent')).toBeInTheDocument();
  });

  it('there are Connectors and Logs tabs', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/connectors'],
      }),
      location: createLocation('/connectors'),
      match: {
        isExact: true,
        path: '/connectors',
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Connectors');
    expect(tabs[1]).toHaveTextContent('Logs');
  });

  it('show "Create connector" and "Documentation" buttons when on Connectors tab', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/connectors'],
      }),
      location: createLocation('/connectors'),
      match: {
        isExact: true,
        path: '/connectors',
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    const createConnectorButton = await screen.findByRole('button', { name: 'Create connector' });
    expect(createConnectorButton).toBeEnabled();

    const documentationButton = await screen.findByRole('link', { name: 'Documentation' });
    expect(documentationButton).toBeEnabled();
  });

  it('show "Create connector" and "Documentation" buttons when on Connectors Edit tab', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/connectors/1'],
      }),
      location: createLocation('/connectors/1'),
      match: {
        isExact: true,
        path: '/connectors/1',
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    const createConnectorButton = await screen.findByRole('button', { name: 'Create connector' });
    expect(createConnectorButton).toBeEnabled();

    const documentationButton = await screen.findByRole('link', { name: 'Documentation' });
    expect(documentationButton).toBeEnabled();
  });

  it('hide "Create connector" button when on Logs tab', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/logs'],
      }),
      location: createLocation('/logs'),
      match: {
        isExact: true,
        path: '/logs',
        url: '',
        params: {
          section: 'logs',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    const documentationButton = await screen.findByRole('link', { name: 'Documentation' });
    expect(documentationButton).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Create connector' })).not.toBeInTheDocument();
  });

  it('show "Select a connector" flyout when "Create connector" button pressed', async () => {
    const props: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory({
        initialEntries: ['/connectors'],
      }),
      location: createLocation('/connectors'),
      match: {
        isExact: true,
        path: '/connectors',
        url: '',
        params: {
          section: 'connectors',
        },
      },
    };

    render(
      <IntlProvider locale="en">
        <Router history={props.history}>
          <QueryClientProvider client={queryClient}>
            <ActionsConnectorsHome {...props} />
          </QueryClientProvider>
        </Router>
      </IntlProvider>
    );

    const createConnectorButton = await screen.findByRole('button', { name: 'Create connector' });
    await userEvent.click(createConnectorButton);
    const selectConnectorFlyout = await screen.findByRole('heading', {
      name: 'Select a connector',
    });
    expect(selectConnectorFlyout).toBeInTheDocument();
  });
});
