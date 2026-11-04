/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
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
import { actionTypeRegistryMock } from '../../../action_type_registry.mock';
import { useKibana } from '../../../../common/lib/kibana';

// Jest resolves @elastic/eui to test-env, whose EuiIcon ignores component types.
// Production EuiIcon renders them, so a lazy icon suspends. Mirror that here.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const ReactActual = jest.requireActual('react');

  const EuiIcon = ({
    type,
    className,
    ...rest
  }: {
    type?: unknown;
    className?: string;
    [key: string]: unknown;
  }) => {
    const classes = ['euiIcon', className].filter(Boolean).join(' ');
    if (typeof type === 'string' || type == null) {
      return ReactActual.createElement('span', {
        ...rest,
        className: classes,
        'data-euiicon-type': type,
      });
    }
    return ReactActual.createElement(type as React.ElementType, { ...rest, className: classes });
  };

  return {
    ...actual,
    EuiIcon,
  };
});

let lastActionsConnectorsListProps: Record<string, unknown> | undefined;

jest.mock('../../../lib/action_connector_api', () => ({
  loadAllActions: jest.fn(),
  loadActionTypes: jest.fn(),
  loadConnectorAuthStatus: jest.fn(),
}));
const { loadAllActions, loadActionTypes, loadConnectorAuthStatus } = jest.requireMock(
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

  it('keeps the page mounted when create connector card icons are lazy', async () => {
    let resolveIcon: (value: { default: React.FC<React.SVGProps<SVGSVGElement>> }) => void = () =>
      undefined;
    const deferred = new Promise<{ default: React.FC<React.SVGProps<SVGSVGElement>> }>(
      (resolve) => {
        resolveIcon = resolve;
      }
    );
    const actionType = actionTypeRegistryMock.createMockActionTypeModel({
      id: 'lazy-home-type',
      iconClass: lazy(() => deferred),
      selectMessage: 'test',
      actionConnectorFields: null,
    });
    const { actionTypeRegistry } = useKibana().services;
    (actionTypeRegistry.has as jest.Mock).mockReturnValue(true);
    (actionTypeRegistry.get as jest.Mock).mockReturnValue(actionType);
    loadActionTypes.mockResolvedValue([
      {
        id: actionType.id,
        enabled: true,
        name: 'Lazy home',
        enabledInConfig: true,
        enabledInLicense: true,
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
      },
    ]);

    const props = connectorsTabProps();
    render(
      <Suspense fallback={<div data-test-subj="outer-fallback" />}>
        <IntlProvider locale="en">
          <Router history={props.history}>
            <QueryClientProvider client={queryClient}>
              <MockAppHeaderProvider>
                <ActionsConnectorsHome {...props} />
              </MockAppHeaderProvider>
            </QueryClientProvider>
          </Router>
        </IntlProvider>
      </Suspense>
    );

    await userEvent.click(await screen.findByTestId('createConnectorButton'));

    expect(await screen.findByRole('heading', { name: 'Select a connector' })).toBeInTheDocument();
    expect(await screen.findByTestId(`${actionType.id}-card`)).toBeInTheDocument();
    expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    expect(screen.queryByTestId('centerJustifiedSpinner')).not.toBeInTheDocument();

    await act(async () => {
      resolveIcon({
        default: (iconProps) => <svg {...iconProps} data-test-subj="resolved-home-icon" />,
      });
    });

    expect(await screen.findByTestId('resolved-home-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('outer-fallback')).not.toBeInTheDocument();
    expect(screen.queryByTestId('centerJustifiedSpinner')).not.toBeInTheDocument();
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
