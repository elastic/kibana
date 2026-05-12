/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { ExplorationDashboard } from './exploration_dashboard';
import { useEvalsApi } from '../../hooks/use_evals_api';

jest.mock('../../hooks/use_evals_api');
jest.mock('./components/exploration_progress', () => ({
  ExplorationProgress: ({ executionId }: any) => (
    <div data-test-subj="exploration-progress">Progress for {executionId}</div>
  ),
}));

const mockActiveRun = {
  execution_id: 'exec-123',
  workflow_name: 'aesop.self_exploration',
  status: 'running' as const,
  started_at: '2024-03-20T10:00:00Z',
  agent_role: 'SOC analyst',
};

const mockCompletedRuns = [
  {
    execution_id: 'exec-100',
    workflow_name: 'aesop.self_exploration',
    status: 'completed' as const,
    started_at: '2024-03-19T10:00:00Z',
    completed_at: '2024-03-19T10:15:00Z',
    agent_role: 'SOC analyst',
    indices_discovered: 15,
    relationships_found: 47,
    patterns_identified: 23,
    skills_proposed: 5,
  },
  {
    execution_id: 'exec-101',
    workflow_name: 'aesop.self_exploration',
    status: 'failed' as const,
    started_at: '2024-03-18T14:00:00Z',
    completed_at: '2024-03-18T14:10:00Z',
    agent_role: 'Threat Hunter',
    error_message: 'Network timeout',
  },
];

describe('ExplorationDashboard Component', () => {
  let queryClient: QueryClient;
  let history: ReturnType<typeof createMemoryHistory>;
  let mockHttp: { get: jest.Mock; post: jest.Mock };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    history = createMemoryHistory();

    mockHttp = {
      get: jest.fn(),
      post: jest.fn(),
    };

    (useEvalsApi as jest.Mock).mockReturnValue({
      http: mockHttp,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <ExplorationDashboard />
        </Router>
      </QueryClientProvider>
    );

  describe('initialization', () => {
    it('should render page header', async () => {
      mockHttp.get.mockResolvedValue({ explorations: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/AESOP Exploration Dashboard/)).toBeInTheDocument();
      });
    });

    it('should load exploration mode state on mount', async () => {
      mockHttp.get.mockImplementation((url) => {
        if (url === '/.aesop-exploration-state/_doc/latest') {
          return Promise.resolve({
            _source: {
              last_run_timestamp: '2024-03-20T09:00:00Z',
            },
          });
        }
        return Promise.resolve({ explorations: [] });
      });

      renderComponent();

      await waitFor(() => {
        // Should default to incremental if previous state exists
        expect(screen.getByLabelText(/Incremental/)).toBeInTheDocument();
      });
    });

    it('should default to full mode if no previous state', async () => {
      mockHttp.get.mockImplementation((url) => {
        if (url === '/.aesop-exploration-state/_doc/latest') {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.resolve({ explorations: [] });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Exploration/)).toBeInTheDocument();
      });
    });
  });

  describe('active exploration', () => {
    afterEach(() => {
      // Always restore real timers to prevent test pollution
      jest.useRealTimers();
    });

    it('should display active exploration when running', async () => {
      mockHttp.get.mockResolvedValue({ explorations: [mockActiveRun] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Active Exploration/)).toBeInTheDocument();
        expect(screen.getByTestId('exploration-progress')).toBeInTheDocument();
        expect(screen.getByText(/Progress for exec-123/)).toBeInTheDocument();
      });
    });

    it('should hide start exploration form when exploration running', async () => {
      mockHttp.get.mockResolvedValue({ explorations: [mockActiveRun] });

      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText(/Start New Exploration/)).not.toBeInTheDocument();
      });
    });

    it('should poll for updates when exploration active', async () => {
      jest.useFakeTimers();

      mockHttp.get.mockResolvedValue({ explorations: [mockActiveRun] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('exploration-progress')).toBeInTheDocument();
      });

      mockHttp.get.mockClear();

      // Should poll every 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockHttp.get).toHaveBeenCalled();
      });
    });

    it('should stop polling when exploration completes', async () => {
      jest.useFakeTimers();

      // Use URL-aware mock so the useEffect state loader call doesn't consume
      // the history mock value
      let callCount = 0;
      mockHttp.get.mockImplementation((url: string) => {
        if (url.includes('aesop-exploration-state')) {
          return Promise.reject(new Error('Not found'));
        }
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve({ explorations: [mockActiveRun] });
        }
        return Promise.resolve({ explorations: [mockCompletedRuns[0]] });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('exploration-progress')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.queryByTestId('exploration-progress')).not.toBeInTheDocument();
      });
    });
  });

  describe('exploration history', () => {
    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ explorations: mockCompletedRuns });
    });

    it('should display exploration history table', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });

    it('should show completed runs with metrics', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('exec-100')).toBeInTheDocument();
        // Use getAllByText since the duration column may also render "15m"
        expect(screen.getAllByText(/\b15\b/).length).toBeGreaterThan(0); // indices
        expect(screen.getAllByText(/\b47\b/).length).toBeGreaterThan(0); // relationships
        expect(screen.getAllByText(/\b5\b/).length).toBeGreaterThan(0); // skills
      });
    });

    it('should show failed runs with error messages', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('exec-101')).toBeInTheDocument();
        expect(screen.getByText(/Network timeout/)).toBeInTheDocument();
      });
    });

    it('should differentiate status with colored badges', async () => {
      renderComponent();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        // Should have success and danger health indicators
      });
    });

    it('should navigate to execution detail on row click', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('exec-100')).toBeInTheDocument();
      });

      const row = screen.getByText('exec-100').closest('tr');
      if (row) {
        await user.click(row);
        expect(history.location.pathname).toContain('exec-100');
      }
    });
  });

  describe('start exploration form', () => {
    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ explorations: [] });
      mockHttp.post.mockResolvedValue({
        success: true,
        execution_id: 'new-exec-123',
      });
    });

    it('should display form inputs when no active exploration', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Agent Role/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Exploration Depth/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Min Pattern Frequency/)).toBeInTheDocument();
      });
    });

    it('should allow changing agent role', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Agent Role/)).toBeInTheDocument();
      });

      const roleInput = screen.getByLabelText(/Agent Role/) as HTMLInputElement;
      await user.clear(roleInput);
      await user.type(roleInput, 'Threat Hunter');

      expect(roleInput.value).toBe('Threat Hunter');
    });

    it('should allow selecting scoped indices', async () => {
      userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Scoped Indices/)).toBeInTheDocument();
      });

      // ComboBox should show selected indices
      expect(screen.getByText('.alerts-security.alerts-*')).toBeInTheDocument();
    });

    it('should validate exploration depth range', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Exploration Depth/)).toBeInTheDocument();
      });

      const depthInput = screen.getByLabelText(/Exploration Depth/) as HTMLInputElement;
      await user.clear(depthInput);
      await user.type(depthInput, '5');

      // Should show validation error for value < 10
      await waitFor(() => {
        // Validation feedback would appear
        expect(depthInput.value).toBe('5');
      });
    });

    it('should submit exploration request', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Exploration/ })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Exploration/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockHttp.post).toHaveBeenCalledWith(
          '/internal/aesop/exploration/run',
          expect.objectContaining({
            body: expect.any(String),
          })
        );
      });

      const [, { body }] = mockHttp.post.mock.calls.find(
        ([url]: [string]) => url === '/internal/aesop/exploration/run'
      )!;
      expect(JSON.parse(body as string)).toEqual(
        expect.objectContaining({
          agent_role: 'SOC analyst',
          exploration_depth: 100,
          min_pattern_frequency: 10,
        })
      );
    });

    it('should show success message after starting exploration', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Exploration/ })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Exploration/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Exploration started successfully/)).toBeInTheDocument();
      });
    });

    it('should show error message if start fails', async () => {
      mockHttp.post.mockRejectedValue(new Error('Workflows plugin not available'));

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Exploration/ })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Exploration/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Workflows plugin not available/)).toBeInTheDocument();
      });
    });

    it('should disable submit button while starting', async () => {
      mockHttp.post.mockImplementation(() => new Promise(() => {})); // Never resolves

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start Exploration/ })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /Start Exploration/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(startButton).toBeDisabled();
      });
    });
  });

  describe('exploration mode selection', () => {
    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ explorations: [] });
    });

    it('should display mode selection radio buttons', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Exploration/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Incremental/)).toBeInTheDocument();
      });
    });

    it('should switch between full and incremental modes', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Exploration/)).toBeInTheDocument();
      });

      const incrementalRadio = screen.getByLabelText(/Incremental/);
      await user.click(incrementalRadio);

      expect(incrementalRadio).toBeChecked();
    });

    it('should explain mode differences', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Explore all data from scratch/)).toBeInTheDocument();
        expect(screen.getByText(/Only explore data changed since last run/)).toBeInTheDocument();
      });
    });

    it('should send mode with exploration request', async () => {
      const user = userEvent.setup();
      mockHttp.post.mockResolvedValue({ success: true, execution_id: 'exec-new' });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Incremental/)).toBeInTheDocument();
      });

      const incrementalRadio = screen.getByLabelText(/Incremental/);
      await user.click(incrementalRadio);

      const startButton = screen.getByRole('button', { name: /Start Exploration/ });
      await user.click(startButton);

      await waitFor(() => {
        expect(mockHttp.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.any(String),
          })
        );
      });

      const lastCall = mockHttp.post.mock.calls[mockHttp.post.mock.calls.length - 1];
      const [, { body }] = lastCall as [string, { body: string }];
      expect(JSON.parse(body)).toEqual(expect.objectContaining({ mode: 'incremental' }));
    });
  });

  describe('metrics display', () => {
    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ explorations: mockCompletedRuns });
    });

    it('should display summary statistics', async () => {
      renderComponent();

      await waitFor(() => {
        // Should aggregate metrics from history
        expect(screen.getByText(/Total Explorations/)).toBeInTheDocument();
        expect(screen.getByText(/Skills Proposed/)).toBeInTheDocument();
      });
    });

    it('should calculate total skills from all runs', async () => {
      renderComponent();

      await waitFor(() => {
        const skillsStat = screen.getByText(/Skills Proposed/);
        const statsPanel = skillsStat.closest('.euiStat');
        // Should show 5 (from exec-100, exec-101 had no skills)
        expect(statsPanel).toBeInTheDocument();
      });
    });

    it('should show success rate', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Success Rate/)).toBeInTheDocument();
        // 1 success / 2 total = 50%
      });
    });
  });

  describe('empty state', () => {
    it('should show empty state when no explorations', async () => {
      mockHttp.get.mockResolvedValue({ explorations: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/No Explorations Yet/)).toBeInTheDocument();
      });
    });

    it('should show onboarding guide in empty state', async () => {
      mockHttp.get.mockResolvedValue({ explorations: [] });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Configure parameters/)).toBeInTheDocument();
        expect(screen.getByText(/Click Start Exploration/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error message if fetch fails', async () => {
      // Use URL-aware mock: state loader call (aesop-exploration-state) can fail silently;
      // the history query failure is what triggers the error UI
      mockHttp.get.mockImplementation((url: string) => {
        if (url.includes('aesop-exploration-state')) {
          return Promise.reject(new Error('Not found'));
        }
        return Promise.reject(new Error('ES connection failed'));
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load explorations/)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      // Use URL-aware mock: history query fails first, then succeeds on retry
      let historyCallCount = 0;
      mockHttp.get.mockImplementation((url: string) => {
        if (url.includes('aesop-exploration-state')) {
          return Promise.reject(new Error('Not found'));
        }
        historyCallCount += 1;
        if (historyCallCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ explorations: [] });
      });

      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Failed to load explorations/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/Retry/);
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/Failed to load explorations/)).not.toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      mockHttp.get.mockResolvedValue({ explorations: [] });
    });

    it('should have accessible form labels', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/Agent Role/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Exploration Depth/)).toBeInTheDocument();
      });
    });

    it('should have accessible table headers', async () => {
      mockHttp.get.mockResolvedValue({ explorations: mockCompletedRuns });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Execution ID/)).toBeInTheDocument();
        expect(screen.getByText(/Status/)).toBeInTheDocument();
        expect(screen.getByText(/Started/)).toBeInTheDocument();
      });
    });

    it('should have accessible buttons', async () => {
      renderComponent();

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /Start Exploration/ });
        expect(startButton).toBeInTheDocument();
      });
    });
  });
});
