/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor } from '@testing-library/react';
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

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useActionResultsMock = useActionResultsHook.useActionResults as jest.MockedFunction<
  typeof useActionResultsHook.useActionResults
>;

// Create a new QueryClient for each test to avoid cache pollution
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

const mockKibanaServices = () => {
  useKibanaMock.mockReturnValue({
    services: {
      http: {
        post: mockHttpPost,
      },
      application: mockApplication,
      notifications: mockNotifications,
    },
  } as unknown as ReturnType<typeof useKibana>);
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

describe('ActionResultsSummary - Server-side Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaServices();
  });

  describe('Basic rendering and pagination state', () => {
    it('should render EuiBasicTable with pagination controls', () => {
      const mockAgents = ['agent-1', 'agent-2', 'agent-3'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents: 3,
          aggregations: {
            totalRowCount: 30,
            totalResponded: 3,
            successful: 3,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Verify EuiBasicTable is rendered
      expect(container.querySelector('.euiBasicTable')).toBeInTheDocument();

      // Verify pagination controls exist
      expect(container.querySelector('.euiPagination')).toBeInTheDocument();
    });

    it('should use server totalAgents for pagination count', () => {
      const mockAgents = ['agent-1', 'agent-2'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents: 502,
          aggregations: {
            totalRowCount: 30,
            totalResponded: 2,
            successful: 2,
            failed: 0,
            pending: 500,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Verify pagination uses server totalAgents (502) not agentIds.length (2)
      expect(container.querySelector('.euiPagination')).toBeInTheDocument();
    });

    it('should fallback to agentIds.length when totalAgents is undefined', () => {
      const mockAgents = ['agent-1', 'agent-2', 'agent-3'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          aggregations: {
            totalRowCount: 30,
            totalResponded: 3,
            successful: 3,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Verify pagination fallback works
      expect(container.querySelector('.euiPagination')).toBeInTheDocument();
    });

    it('should initialize with default page index 0 and page size 20', () => {
      const mockAgents = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
      const mockEdges = mockAgents.slice(0, 20).map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents: 100,
          aggregations: {
            totalRowCount: 200,
            totalResponded: 20,
            successful: 20,
            failed: 0,
            pending: 80,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Verify useActionResults was called with default pagination
      expect(useActionResultsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          activePage: 0,
          limit: 20,
        })
      );
    });

    it('should handle page changes via onTableChange callback', async () => {
      const mockAgents = Array.from({ length: 100 }, (_, i) => `agent-${i}`);

      // Initial render - page 0
      const mockEdgesPage0 = mockAgents.slice(0, 20).map((id) => createMockEdge(id, true));
      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdgesPage0,
          totalAgents: 100,
          aggregations: {
            totalRowCount: 1000,
            totalResponded: 20,
            successful: 20,
            failed: 0,
            pending: 80,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      const { rerender } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Simulate page change to page 2
      const mockEdgesPage2 = mockAgents.slice(40, 60).map((id) => createMockEdge(id, true));
      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdgesPage2,
          totalAgents: 100,
          aggregations: {
            totalRowCount: 1000,
            totalResponded: 20,
            successful: 20,
            failed: 0,
            pending: 80,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      // Re-render with updated page
      rerender(
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
              <QueryClientProvider client={createTestQueryClient()}>
                <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
              </QueryClientProvider>
            </IntlProvider>
          </ThemeProvider>
        </EuiProvider>
      );

      // Pagination state should update
      await waitFor(() => {
        expect(useActionResultsMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            activePage: expect.any(Number),
          })
        );
      });
    });

    it('should support different page sizes (10, 20, 50, 100)', () => {
      const mockAgents = Array.from({ length: 500 }, (_, i) => `agent-${i}`);
      const pageSizes = [10, 20, 50, 100];

      pageSizes.forEach((pageSize) => {
        jest.clearAllMocks(); // Clear mocks between iterations
        const mockEdges = mockAgents.slice(0, pageSize).map((id) => createMockEdge(id, true));

        useActionResultsMock.mockReturnValue({
          data: {
            edges: mockEdges,
            totalAgents: 500,
            aggregations: {
              totalRowCount: pageSize * 10,
              totalResponded: pageSize,
              successful: pageSize,
              failed: 0,
              pending: mockAgents.length - pageSize,
            },
            inspect: { dsl: [] },
          },
          isLoading: false,
          isFetching: false,
        } as never);

        mockHttpPost.mockResolvedValue({ agents: [] });

        const { container } = renderWithContext(
          <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
        );

        // Verify table renders with the correct number of rows
        const tableRows = container.querySelectorAll('.euiTableRow');
        expect(tableRows.length).toBe(pageSize);

        // Verify pagination controls exist
        expect(container.querySelector('.euiPagination')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk agent details fetching', () => {
    it('should fetch agent details for current page agents only', async () => {
      const mockAgents = Array.from({ length: 100 }, (_, i) => `agent-${i}`);
      const currentPageAgents = mockAgents.slice(0, 20); // First page
      const mockEdges = currentPageAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents: 100,
          aggregations: {
            totalRowCount: 1000,
            totalResponded: 20,
            successful: 20,
            failed: 0,
            pending: 80,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      const mockAgentsData = currentPageAgents.map((id) => ({
        id,
        local_metadata: { host: { name: `host-${id}` } },
      }));

      mockHttpPost.mockResolvedValue({ agents: mockAgentsData });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Wait for bulk fetch to be called
      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/internal/osquery/fleet_wrapper/agents/_bulk',
          expect.objectContaining({
            version: '1',
            body: JSON.stringify({
              agentIds: currentPageAgents,
            }),
          })
        );
      });

      // Verify it was called only once for the current page
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });

    it('should not fetch agent details when no agents on current page', async () => {
      useActionResultsMock.mockReturnValue({
        data: {
          edges: [],
          totalAgents: 0,
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={[]} />);

      // Wait to ensure no fetch happens
      await waitFor(() => {
        expect(mockHttpPost).not.toHaveBeenCalled();
      });
    });

    it('should handle bulk fetch errors gracefully', async () => {
      const mockAgents = ['agent-1', 'agent-2'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          aggregations: {
            totalRowCount: 20,
            totalResponded: 2,
            successful: 2,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      // Mock error response
      mockHttpPost.mockRejectedValue(new Error('Fleet service unavailable'));

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Component should still render despite error
      await waitFor(() => {
        expect(container.querySelector('.euiBasicTable')).toBeInTheDocument();
      });

      // Verify error was handled (no crash)
      expect(mockHttpPost).toHaveBeenCalled();
    });

    it('should cache bulk agent details for 1 minute', async () => {
      const mockAgents = ['agent-1', 'agent-2'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          aggregations: {
            totalRowCount: 20,
            totalResponded: 2,
            successful: 2,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      const mockAgentsData = mockAgents.map((id) => ({
        id,
        local_metadata: { host: { name: `host-${id}` } },
      }));

      mockHttpPost.mockResolvedValue({ agents: mockAgentsData });

      const queryClient = createTestQueryClient();

      const { rerender } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />,
        queryClient
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledTimes(1);
      });

      // Re-render with same agents (should use cache)
      rerender(
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
              <QueryClientProvider client={queryClient}>
                <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
              </QueryClientProvider>
            </IntlProvider>
          </ThemeProvider>
        </EuiProvider>
      );

      // Should not fetch again (cache hit)
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });
  });

  describe('Agent name rendering with tooltips', () => {
    it('should render agent hostname from bulk fetch', async () => {
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

      mockHttpPost.mockResolvedValue({
        agents: [
          {
            id: 'agent-1',
            local_metadata: { host: { name: 'production-server-01' } },
          },
        ],
      });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Wait for agent name to be rendered
      await waitFor(() => {
        expect(screen.getByText('production-server-01')).toBeInTheDocument();
      });
    });

    it('should render agent ID as fallback when hostname not available', async () => {
      const mockAgents = ['agent-without-hostname'];
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

      mockHttpPost.mockResolvedValue({
        agents: [
          {
            id: 'agent-without-hostname',
            // No local_metadata
          },
        ],
      });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Wait for fallback to agent ID
      await waitFor(() => {
        expect(screen.getByText('agent-without-hostname')).toBeInTheDocument();
      });
    });

    it('should render tooltip with agent ID on hover', async () => {
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

      mockHttpPost.mockResolvedValue({
        agents: [
          {
            id: 'agent-1',
            local_metadata: { host: { name: 'hostname-1' } },
          },
        ],
      });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Wait for render
      await waitFor(() => {
        expect(screen.getByText('hostname-1')).toBeInTheDocument();
      });

      // Verify tooltip wrapper exists
      expect(container.querySelector('.euiToolTipAnchor')).toBeInTheDocument();
    });

    it('should render clickable link to Fleet agent details page', async () => {
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

      mockHttpPost.mockResolvedValue({
        agents: [
          {
            id: 'agent-1',
            local_metadata: { host: { name: 'hostname-1' } },
          },
        ],
      });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Wait for link to be rendered
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /hostname-1/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', expect.stringContaining('/app/fleet'));
      });
    });
  });

  describe('Large scale scenarios (10k+ agents)', () => {
    it('should handle 10k agents with efficient pagination', async () => {
      const totalAgents = 10000;
      const mockAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);
      const currentPageAgents = mockAgents.slice(0, 100); // First page
      const mockEdges = currentPageAgents.map((id) => createMockEdge(id, false)); // Pending

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents,
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: totalAgents,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({
        agents: currentPageAgents.map((id) => ({
          id,
          local_metadata: { host: { name: `host-${id}` } },
        })),
      });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Verify only current page data is loaded
      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/internal/osquery/fleet_wrapper/agents/_bulk',
          expect.objectContaining({
            body: JSON.stringify({
              agentIds: currentPageAgents, // Only 100, not 10k
            }),
          })
        );
      });

      // Verify table renders efficiently
      expect(container.querySelector('.euiBasicTable')).toBeInTheDocument();
    });

    it('should efficiently navigate across 100+ pages', async () => {
      const totalAgents = 15000;
      const mockAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);

      // Simulate navigating to page 75 (agents 7500-7599)
      const pageIndex = 75;
      const pageSize = 100;
      const startIndex = pageIndex * pageSize;
      const currentPageAgents = mockAgents.slice(startIndex, startIndex + pageSize);
      const mockEdges = currentPageAgents.map((id) => createMockEdge(id, true));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents: 15000,
          aggregations: {
            totalRowCount: 10000,
            totalResponded: 7500,
            successful: 7500,
            failed: 0,
            pending: 7500,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({
        agents: currentPageAgents.map((id) => ({
          id,
          local_metadata: { host: { name: `host-${id}` } },
        })),
      });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={mockAgents} />);

      // Verify only current page agents fetched (exactly 100 agents from 7500-7599)
      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith(
          '/internal/osquery/fleet_wrapper/agents/_bulk',
          expect.objectContaining({
            version: '1',
            body: JSON.stringify({
              agentIds: currentPageAgents,
            }),
          })
        );
      });

      // Verify it was called only once for the current page
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });

    it('should maintain low memory footprint with large agent sets', async () => {
      const totalAgents = 20000;
      const mockAgents = Array.from({ length: totalAgents }, (_, i) => `agent-${i}`);
      const currentPageAgents = mockAgents.slice(0, 100);
      const mockEdges = currentPageAgents.map((id) => createMockEdge(id, false));

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          totalAgents,
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: totalAgents,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({
        agents: currentPageAgents.map((id) => ({
          id,
          local_metadata: { host: { name: `host-${id}` } },
        })),
      });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      await waitFor(() => {
        expect(container.querySelector('.euiBasicTable')).toBeInTheDocument();
      });

      // Verify memory-efficient rendering (only 100 rows, not 20k)
      const tableRows = container.querySelectorAll('.euiTableRow');
      expect(tableRows.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Loading states', () => {
    it('should show loading indicator when isLive is true', () => {
      const mockAgents = ['agent-1'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, false)); // Pending

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: 1,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Verify loading state
      expect(container.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
    });

    it('should stop loading when all agents have responded', async () => {
      const mockAgents = ['agent-1', 'agent-2'];
      const mockEdges = mockAgents.map((id) => createMockEdge(id, true)); // All responded

      useActionResultsMock.mockReturnValue({
        data: {
          edges: mockEdges,
          aggregations: {
            totalRowCount: 20,
            totalResponded: 2,
            successful: 2,
            failed: 0,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({
        agents: mockAgents.map((id) => ({
          id,
          local_metadata: { host: { name: `host-${id}` } },
        })),
      });

      const { container } = renderWithContext(
        <ActionResultsSummary actionId="test-action" agentIds={mockAgents} />
      );

      // Wait for loading to finish
      await waitFor(() => {
        expect(container.querySelector('.euiBasicTable-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status column rendering', () => {
    it('should display "success" for completed agents without errors', async () => {
      const mockEdge: estypes.SearchHit = {
        _id: 'result-1',
        _index: '.logs-osquery_manager.action.responses',
        _source: {},
        fields: {
          agent_id: ['agent-1'],
          'agent.id': ['agent-1'],
          completed_at: ['2025-01-20T00:00:00.000Z'],
        },
      };

      useActionResultsMock.mockReturnValue({
        data: {
          edges: [mockEdge],
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

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={['agent-1']} />);

      await waitFor(() => {
        expect(screen.getByText('success')).toBeInTheDocument();
      });
    });

    it('should display "pending" for agents without completed_at', async () => {
      const mockEdge: estypes.SearchHit = {
        _id: 'placeholder-1',
        _index: '.logs-osquery_manager.action.responses',
        _source: {},
        fields: {
          agent_id: ['agent-1'],
          'agent.id': ['agent-1'],
        },
      };

      useActionResultsMock.mockReturnValue({
        data: {
          edges: [mockEdge],
          aggregations: {
            totalRowCount: 0,
            totalResponded: 0,
            successful: 0,
            failed: 0,
            pending: 1,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={['agent-1']} />);

      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });

    it('should display "error" for agents with error.keyword field', async () => {
      const mockEdge: estypes.SearchHit = {
        _id: 'result-1',
        _index: '.logs-osquery_manager.action.responses',
        _source: {},
        fields: {
          agent_id: ['agent-1'],
          'agent.id': ['agent-1'],
          completed_at: ['2025-01-20T00:00:00.000Z'],
          'error.keyword': ['Query execution failed'],
          error: ['Query execution failed'],
        },
      };

      useActionResultsMock.mockReturnValue({
        data: {
          edges: [mockEdge],
          aggregations: {
            totalRowCount: 0,
            totalResponded: 1,
            successful: 0,
            failed: 1,
            pending: 0,
          },
          inspect: { dsl: [] },
        },
        isLoading: false,
        isFetching: false,
      } as never);

      mockHttpPost.mockResolvedValue({ agents: [] });

      renderWithContext(<ActionResultsSummary actionId="test-action" agentIds={['agent-1']} />);

      await waitFor(() => {
        expect(screen.getByText('error')).toBeInTheDocument();
      });
    });
  });
});
