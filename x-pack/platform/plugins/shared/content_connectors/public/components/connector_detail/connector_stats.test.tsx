/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./connector_detail', () => ({
  ConnectorDetailTabId: {
    CONFIGURATION: 'configuration',
    DOCUMENTS: 'documents',
  },
}));

import React from 'react';

import { fireEvent, screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { Connector } from '@kbn/search-connectors';
import { ConnectorStatus } from '@kbn/search-connectors';

import { AppContextProvider } from '../../app_context';
import type { AppDependencies, SearchConnectorsPluginStartDependencies } from '../../types';
import type { GetConnectorAgentlessPolicyApiResponse } from '../../api/connector/get_connector_agentless_policy_api_logic';
import { ConnectorStats } from './connector_stats';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    createHref: ({ pathname }: { pathname: string }) => pathname,
    push: jest.fn(),
  }),
}));

const CONNECTOR_ID = '65b72bc6-823e-4278-8f21-9864c8a93046';
const AGENT_ID = 'b03f48ce-7150-11f1-b0f6-56955dd08213';

const connector = {
  id: CONNECTOR_ID,
  index_name: 'search-jira',
  is_native: true,
  service_type: 'jira',
  status: ConnectorStatus.CONNECTED,
} as unknown as Connector;

const agentlessOverview = {
  agent: { id: AGENT_ID, status: 'online' },
  policy: { id: 'policy-id', name: 'policy-name' },
} as unknown as GetConnectorAgentlessPolicyApiResponse;

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

describe('ConnectorStats', () => {
  const navigate = jest.fn();

  const appContext = {
    connectorTypes: [],
    hasPlatinumLicense: false,
    isAgentlessEnabled: true,
    isCloud: true,
    kibanaVersion: '9.4.0',
    plugins: {
      discover: { locator: { navigate } },
    } as unknown as SearchConnectorsPluginStartDependencies,
  } as AppDependencies;

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { http: httpServiceMock.createSetupContract() },
    } as unknown as ReturnType<typeof useKibana>);
  });

  const renderStats = (overview?: GetConnectorAgentlessPolicyApiResponse) =>
    renderWithKibanaRenderContext(
      <AppContextProvider value={appContext}>
        <ConnectorStats connector={connector} agentlessOverview={overview} />
      </AppContextProvider>
    );

  it('opens Discover with well formed connector and agent log filters', () => {
    renderStats(agentlessOverview);

    fireEvent.click(screen.getByTestId('connectorStatsViewLogsButton'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewId: 'logs-*',
        filters: [
          {
            meta: {
              alias: null,
              disabled: false,
              index: 'logs-*',
              key: 'labels.connector_id',
              negate: false,
              params: { query: CONNECTOR_ID },
              type: 'phrase',
            },
            query: { match_phrase: { 'labels.connector_id': CONNECTOR_ID } },
            $state: { store: 'appState' },
          },
          {
            meta: {
              alias: null,
              disabled: false,
              index: 'logs-*',
              key: 'elastic_agent.id',
              negate: false,
              params: { query: AGENT_ID },
              type: 'phrase',
            },
            query: { match_phrase: { 'elastic_agent.id': AGENT_ID } },
            $state: { store: 'appState' },
          },
        ],
      })
    );
  });

  it('disables the logs button when the connector has no agent', () => {
    renderStats(undefined);

    expect(screen.getByTestId('connectorStatsViewLogsButton')).toBeDisabled();
  });
});
