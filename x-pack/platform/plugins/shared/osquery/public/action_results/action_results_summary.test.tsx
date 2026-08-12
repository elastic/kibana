/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

import { ActionResultsSummary } from './action_results_summary';
import * as useActionResultsHook from './use_action_results';
import { useKibana } from '../common/lib/kibana';
import type { estypes } from '@elastic/elasticsearch';

jest.mock('./use_action_results');
jest.mock('../common/lib/kibana');
jest.mock('./unified_action_results_summary', () => ({
  UnifiedActionResultsSummary: () => (
    <div data-test-subj="unifiedActionResultsSummary">Unified Table</div>
  ),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useActionResultsMock = useActionResultsHook.useActionResults as jest.MockedFunction<
  typeof useActionResultsHook.useActionResults
>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

const mockHttpPost = jest.fn();
const mockApplication = {
  getUrlForApp: jest.fn().mockReturnValue('/app/fleet/agents/agent-1'),
};
const mockNotifications = {
  toasts: {
    addSuccess: jest.fn(),
    addError: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
  },
};

const renderWithContext = (Element: React.ReactElement, queryClient = createTestQueryClient()) =>
  render(
    <EuiProvider>
      <ThemeProvider
        theme={{
          euiTheme: {
            colors: { success: '#00BFB3' },
            border: { width: { thin: '1px', thick: '2px' } },
          } as unknown as EuiThemeComputed<{}>,
        }}
      >
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
        </IntlProvider>
      </ThemeProvider>
    </EuiProvider>
  );

const createMockEdge = (agentId: string, hasResponse = false): estypes.SearchHit => ({
  _id: hasResponse ? `result-${agentId}` : `placeholder-${agentId}`,
  _index: '.logs-osquery_manager.action.responses-default',
  _source: hasResponse
    ? {
        action_response: {
          osquery: {
            count: 10,
          },
        },
      }
    : {},
  fields: {
    agent_id: [agentId],
    'agent.id': [agentId],
    ...(hasResponse ? { completed_at: ['2025-01-20T00:00:00.000Z'] } : {}),
  },
});

describe('ActionResultsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMockData = () => {
    const mockAgents = ['agent-1'];
    const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

    useActionResultsMock.mockReturnValue({
      data: {
        edges: mockEdges,
        aggregations: {
          totalRowCount: 10,
          totalResponded: 1,
          successful: 1,
          failed: 0,
          pending: 0,
        },
        inspect: { dsl: [] },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    mockHttpPost.mockResolvedValue({ agents: [] });

    return mockAgents;
  };

  it('should render unified table when uiActions is available', () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: { post: mockHttpPost },
        application: mockApplication,
        notifications: mockNotifications,
        uiActions: { getTriggerCompatibleActions: jest.fn() },
      },
    } as unknown as ReturnType<typeof useKibana>);

    const mockAgents = setupMockData();

    renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

    expect(screen.getByTestId('unifiedActionResultsSummary')).toBeInTheDocument();
  });

  it('should render nothing when uiActions is unavailable', () => {
    useKibanaMock.mockReturnValue({
      services: {
        http: { post: mockHttpPost },
        application: mockApplication,
        notifications: mockNotifications,
      },
    } as unknown as ReturnType<typeof useKibana>);

    const mockAgents = setupMockData();

    const { container } = renderWithContext(
      <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
    );

    expect(container.querySelector('.euiBasicTable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unifiedActionResultsSummary')).not.toBeInTheDocument();
  });
});
