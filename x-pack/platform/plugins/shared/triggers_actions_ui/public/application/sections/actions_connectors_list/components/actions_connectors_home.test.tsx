/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { RouteComponentProps } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMemoryHistory, createLocation } from 'history';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { MatchParams } from './actions_connectors_home';
import ActionsConnectorsHome from './actions_connectors_home';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import userEvent from '@testing-library/user-event';

let lastActionsConnectorsListProps: Record<string, unknown> | undefined;

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
  loadConnectorAuthStatus: jest.fn(),
}));
const { loadAllActions, loadConnectorAuthStatus } = jest.requireMock(
  '../../../lib/action_connector_api'
);
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/capabilities', () => ({
  hasSaveActionsCapability: jest.fn(),
}));
const { hasSaveActionsCapability } = jest.requireMock('../../../lib/capabilities');
jest.mock('../../../../common/get_experimental_features');
jest.mock('../../../components/health_check', () => ({
  HealthCheck: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../../context/health_context', () => ({
  HealthContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./actions_connectors_list', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    lastActionsConnectorsListProps = props;
    return (
      <div data-test-subj="actionsConnectorsListComponent">
        {'Render Actions connectors list component'}
      </div>
    );
  },
}));
jest.mock('./actions_connectors_event_log_list_table', () => {
  return () => (
    <div data-test-subj="connectorEventLogListTableComponent">
      {'Render Connector Event log list table component'}
    </div>
  );
});

const queryClient = new QueryClient();

const renderHome = (props: RouteComponentProps<MatchParams>) =>
  render(
    <IntlProvider locale="en">
      <Router history={props.history}>
        <QueryClientProvider client={queryClient}>
          <MockAppHeaderProvider>
            <ActionsConnectorsHome {...props} />
          </MockAppHeaderProvider>
        </QueryClientProvider>
      </Router>
    </IntlProvider>
  );

const expectDocumentationInOverflow = async () => {
  await openAppMenuOverflow();
  expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toBeInTheDocument();
};

const connectorsTabProps = (): RouteComponentProps<MatchParams> => ({
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
});

describe('ActionsConnectorsHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasSaveActionsCapability.mockReturnValue(true);
    lastActionsConnectorsListProps = undefined;
    loadAllActions.mockResolvedValue([]);
    loadConnectorAuthStatus.mockResolvedValue({});
  });

  it('renders Actions connectors list component', async () => {
    renderHome(connectorsTabProps());

    expect(loadAllActions).toHaveBeenCalled();
    expect(await screen.findByTestId('actionsConnectorsListComponent')).toBeInTheDocument();
  });

  it('there are Connectors and Logs tabs', async () => {
    renderHome(connectorsTabProps());

    const tabs = await screen.findAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('Connectors');
    expect(tabs[1]).toHaveTextContent('Logs');
  });

  it('show "Create connector" and "Documentation" buttons when on Connectors tab', async () => {
    renderHome(connectorsTabProps());

    expect(await screen.findByTestId('createConnectorButton')).toBeEnabled();
    await expectDocumentationInOverflow();
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

    renderHome(props);

    expect(await screen.findByTestId('createConnectorButton')).toBeEnabled();
    await expectDocumentationInOverflow();
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

    renderHome(props);

    await expectDocumentationInOverflow();
    expect(screen.queryByTestId('createConnectorButton')).not.toBeInTheDocument();
  });

  it('show "Select a connector" flyout when "Create connector" button pressed', async () => {
    renderHome(connectorsTabProps());

    const createConnectorButton = await screen.findByTestId('createConnectorButton');
    await userEvent.click(createConnectorButton);
    const selectConnectorFlyout = await screen.findByRole('heading', {
      name: 'Select a connector',
    });
    expect(selectConnectorFlyout).toBeInTheDocument();
  });

  it('hide "Create connector" button when the user only has read access', async () => {
    hasSaveActionsCapability.mockReturnValue(false);
    renderHome(connectorsTabProps());

    expect(screen.queryByTestId('createConnectorButton')).not.toBeInTheDocument();
    await expectDocumentationInOverflow();
  });

  it('passes auth-status load failure to connectors list', async () => {
    loadConnectorAuthStatus.mockRejectedValue({
      body: { message: 'Auth status endpoint failed' },
    });

    renderHome(connectorsTabProps());

    await screen.findByTestId('actionsConnectorsListComponent');

    expect(lastActionsConnectorsListProps?.connectorAuthStatusError).toBe(
      'Auth status endpoint failed'
    );
  });
});
