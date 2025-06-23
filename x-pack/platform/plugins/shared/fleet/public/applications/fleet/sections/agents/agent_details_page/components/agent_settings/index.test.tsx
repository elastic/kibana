/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useAuthz, useStartServices } from '../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import { AgentSettings } from '.';

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useLink: jest.fn(),
    useStartServices: jest.fn(),
    useAuthz: jest.fn(),
    useDiscoverLocator: jest.fn().mockImplementation(() => {
      return {
        id: 'DISCOVER_APP_LOCATOR',
        getRedirectUrl: jest.fn().mockResolvedValue('app/discover/logs/someview'),
      };
    }),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentSettings', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
        readAgents: true,
      },
    } as any);
  });
  const renderComponent = (
    opts = {
      agentVersion: '8.11.0',
    }
  ) => {
    const renderer = createFleetTestRendererMock();
    const agent = {
      id: 'agent1',
      local_metadata: { elastic: { agent: { version: opts.agentVersion, log_level: 'debug' } } },
    } as any;
    const agentPolicy = {
      id: 'policy1',
      name: 'policy1',
      revision: 1,
      namespace: 'default',
      updated_at: '2023-10-04T13:08:53.340Z',
      updated_by: 'elastic',
      data_streams: [],
      is_managed: false,
      is_default: false,
      is_preconfigured: false,
    } as any;

    return renderer.render(<AgentSettings agent={agent} agentPolicy={agentPolicy} />);
  };

  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockReturnValue({
      application: {},
      data: {
        query: {
          timefilter: {
            timefilter: {
              calculateBounds: jest.fn().mockReturnValue({
                min: '2023-10-04T13:08:53.340Z',
                max: '2023-10-05T13:08:53.340Z',
              }),
            },
          },
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({
              useUrl: () => 'https://locator.url',
            }),
          },
        },
      },
      docLinks: {
        links: {
          fleet: {
            agentLevelLogging: 'agentLevelLogging',
          },
        },
      },
    });
  };
  it('should show log level dropdown with correct value', () => {
    mockStartServices();
    const result = renderComponent();
    const logLevelDropdown = result.getByTestId('selectAgentLogLevel');
    expect(logLevelDropdown.getElementsByTagName('option').length).toBe(4);
    expect(logLevelDropdown).toHaveDisplayValue('debug');
  });

  it('should hide reset log level button for agents version < 8.15.0', () => {
    mockStartServices();
    const result = renderComponent();
    const resetLogLevelBtn = result.queryByTestId('resetLogLevelBtn');
    expect(resetLogLevelBtn).not.toBeInTheDocument();
  });

  it('should show reset log level button for agents version >= 8.15.0', () => {
    mockStartServices();
    const result = renderComponent({ agentVersion: '8.15.0' });
    const resetLogLevelBtn = result.getByTestId('resetLogLevelBtn');
    expect(resetLogLevelBtn).toBeInTheDocument();
    expect(resetLogLevelBtn).not.toHaveAttribute('disabled');
  });
});
