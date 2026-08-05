/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';

import { useAuthz, useStartServices } from '../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import { AgentLogsUI } from './agent_logs';

jest.mock('@kbn/kibana-utils-plugin/public', () => {
  return {
    ...jest.requireActual('@kbn/kibana-utils-plugin/public'),
    createStateContainerReactHelpers: jest.fn().mockReturnValue({
      useTransitions: jest.fn().mockReturnValue({ update: jest.fn() }),
    }),
  };
});

jest.mock('@kbn/saved-search-component', () => ({
  LazySavedSearchComponent: (props: any) => <div data-test-subj="lazySavedSearchComponent" />,
}));

jest.mock('@kbn/embeddable-plugin/public', () => ({
  ViewMode: {
    VIEW: 'view',
    EDIT: 'edit',
  },
}));

jest.mock('@kbn/logs-shared-plugin/common', () =>
  jest.requireActual('@kbn/logs-shared-plugin/common')
);

jest.mock('@kbn/shared-ux-link-redirect-app', () => {
  return {
    RedirectAppLinks: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

jest.mock('./query_bar', () => {
  return {
    LogQueryBar: () => <div />,
  };
});

jest.mock('./filter_dataset', () => {
  return {
    DatasetFilter: () => <div />,
  };
});

jest.mock('../../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../../hooks'),
    useLink: jest.fn(),
    useStartServices: jest.fn(),
    useAuthz: jest.fn(),
    useDiscoverLocator: jest.fn().mockReturnValue({
      id: 'DISCOVER_APP_LOCATOR',
      getRedirectUrl: jest.fn().mockReturnValue('app/discover/logs/someview'),
    }),
  };
});

const mockUseStartServices = useStartServices as jest.Mock;

describe('AgentLogsUI', () => {
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
    const state = {
      datasets: ['elastic_agent'],
      logLevels: ['info', 'error'],
      start: '2023-20-04T14:00:00.340Z',
      end: '2023-20-04T14:20:00.340Z',
      query: '',
    } as any;
    return renderer.render(<AgentLogsUI agent={agent} state={state} />);
  };

  const mockLogSources = {
    services: {
      logSourcesService: {
        getFlattenedLogSources: jest.fn().mockResolvedValue('logs-*-*'),
      },
    },
  };

  const mockData = {
    query: {
      timefilter: {
        timefilter: {
          calculateBounds: jest.fn().mockReturnValue({
            min: new Date('2023-04-20T14:00:00.340Z'),
            max: new Date('2023-04-20T14:20:00.340Z'),
          }),
        },
      },
    },
    search: {
      searchSource: {
        create: jest.fn(),
      },
    },
    dataViews: {
      create: jest.fn(),
    },
  };

  const mockEmbeddable = {
    EmbeddablePanel: jest.fn().mockImplementation(({ children }) => <div>{children}</div>),
  };

  const mockApplication = {
    capabilities: {
      navLinks: {},
      management: {},
      catalogue: {},
      savedObjectsManagement: {},
    },
  };

  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockImplementation(() => ({
      application: mockApplication,
      data: mockData,
      embeddable: mockEmbeddable,
      dataViews: mockData.dataViews,
      logsDataAccess: mockLogSources,
      searchSource: mockData.search.searchSource,
      isServerlessEnabled: isServerlessEnabled || false,
    }));
  };

  it('should render Open in Discover button linking to logSources-backed data view', async () => {
    mockStartServices();
    const { useDiscoverLocator } = jest.requireMock('../../../../../hooks');
    const locator = useDiscoverLocator();
    const result = renderComponent();

    // Wait for logSources async resolution
    await result.findByTestId('viewInLogsBtn');

    expect(result.getByTestId('viewInLogsBtn')).toHaveAttribute(
      'href',
      'app/discover/logs/someview'
    );

    expect(locator.getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewSpec: expect.objectContaining({
          id: 'discover-observability-solution-all-logs',
          title: 'logs-*-*',
        }),
      })
    );
  });

  it('should not render Open in Discover button while logSources is loading', () => {
    mockStartServices();
    // Override to never resolve so logSources.value stays undefined
    mockLogSources.services.logSourcesService.getFlattenedLogSources.mockReturnValue(
      new Promise(() => {})
    );
    const result = renderComponent();
    expect(result.queryByTestId('viewInLogsBtn')).not.toBeInTheDocument();
  });

  it('should not render Open in Discover button if privileges are not set', async () => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        readAgents: false,
      },
    } as any);
    mockStartServices();
    const result = renderComponent();
    await new Promise((r) => setTimeout(r, 0));
    expect(result.queryByTestId('viewInLogsBtn')).not.toBeInTheDocument();
  });
});
