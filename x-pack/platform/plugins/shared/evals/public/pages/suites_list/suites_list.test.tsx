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
import { SuitesListPage } from '.';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      http: { get: mockGet, post: mockPost },
      notifications: {
        toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
      },
    },
  }),
}));

const mockSuites = [
  {
    id: 'attack-discovery',
    name: 'Attack Discovery',
    tags: ['security', 'llm'],
    config_path: 'x-pack/test/evals/attack_discovery/playwright.config.ts',
    slack_channel: '#security-alerts',
  },
  {
    id: 'agent-builder',
    name: 'Agent Builder',
    tags: ['platform'],
    config_path: 'x-pack/test/evals/agent_builder/playwright.config.ts',
  },
];

const mockConnectors = [
  {
    id: 'conn-openai',
    name: 'OpenAI GPT-4',
    connector_type_id: '.gen-ai',
    is_preconfigured: false,
    is_missing_secrets: false,
  },
  {
    id: 'conn-bedrock',
    name: 'Bedrock Claude',
    connector_type_id: '.bedrock',
    is_preconfigured: false,
    is_missing_secrets: false,
  },
];

const mockRuns = [
  {
    run_id: 'run-abc-123',
    suite_id: 'attack-discovery',
    status: 'completed',
    started_at: new Date(Date.now() - 300_000).toISOString(),
    completed_at: new Date(Date.now() - 60_000).toISOString(),
    exit_code: 0,
    output: ['Running 3 tests using 1 worker', '  PASS test.spec.ts', '3 passed'],
  },
  {
    run_id: 'run-def-456',
    suite_id: 'attack-discovery',
    status: 'failed',
    started_at: new Date(Date.now() - 600_000).toISOString(),
    completed_at: new Date(Date.now() - 500_000).toISOString(),
    exit_code: 1,
    error: 'Process exited with code 1',
    output: ['Running 3 tests using 1 worker', 'Error: test failed', '1 failed'],
  },
];

describe('SuitesListPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();

    mockGet.mockImplementation((url: string) => {
      if (url === '/api/actions/connectors') {
        return Promise.resolve(mockConnectors);
      }
      if (url.includes('/internal/evals/suites') && url.includes('/runs')) {
        return Promise.resolve({ runs: mockRuns });
      }
      if (url.includes('/internal/evals/suites') && !url.includes('/status')) {
        return Promise.resolve({ suites: mockSuites });
      }
      // Status endpoints return idle
      return Promise.resolve({ status: 'idle', suite_id: '' });
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SuitesListPage />
      </QueryClientProvider>
    );

  it('renders the suites table with data', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      expect(screen.getByText('Agent Builder')).toBeInTheDocument();
    });
  });

  it('renders tag badges', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('security')).toBeInTheDocument();
      expect(screen.getByText('llm')).toBeInTheDocument();
      expect(screen.getByText('platform')).toBeInTheDocument();
    });
  });

  it('shows suite IDs in the table', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('attack-discovery')).toBeInTheDocument();
      expect(screen.getByText('agent-builder')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderPage();

    // The EuiBasicTable shows a loading indicator
    expect(document.querySelector('.euiBasicTable-loading')).toBeInTheDocument();
  });

  it('opens run modal when run action is clicked', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
    });

    const runButtons = screen.getAllByLabelText('Run');
    await userEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Run suite/)).toBeInTheDocument();
      expect(screen.getByTestId('evalsSuiteConnectorInput')).toBeInTheDocument();
    });
  });

  it('auto-selects first .gen-ai connector in both dropdowns when modal opens', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
    });

    const runButtons = screen.getAllByLabelText('Run');
    await userEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('evalsSuiteProjectInput')).toBeInTheDocument();
      expect(screen.getByTestId('evalsSuiteConnectorInput')).toBeInTheDocument();
      // Both selects should show the auto-selected .gen-ai connector
      expect(screen.getAllByText('OpenAI GPT-4').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('triggers run mutation on confirm', async () => {
    mockPost.mockResolvedValueOnce({ run_id: 'run-1', status: 'started' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
    });

    const runButtons = screen.getAllByLabelText('Run');
    await userEvent.click(runButtons[0]);

    await waitFor(() => {
      const confirmButton = screen.getByTestId('evalsSuiteRunConfirmButton');
      expect(confirmButton).not.toBeDisabled();
    });

    const confirmButton = screen.getByTestId('evalsSuiteRunConfirmButton');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/internal/evals/suites/attack-discovery/run',
        expect.objectContaining({
          body: JSON.stringify({ connector_id: 'conn-openai', project: 'conn-openai' }),
        })
      );
    });
  });

  it('closes modal on cancel', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
    });

    const runButtons = screen.getAllByLabelText('Run');
    await userEvent.click(runButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Run suite/)).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/Run suite/)).not.toBeInTheDocument();
    });
  });

  describe('detail flyout', () => {
    it('opens flyout when clicking suite name', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId('suiteDetailFlyout')).toBeInTheDocument();
      });
    });

    it('shows suite info in the flyout', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId('suiteDetailFlyout')).toBeInTheDocument();
      });

      // Config path and slack channel from suite metadata
      expect(
        screen.getByText('x-pack/test/evals/attack_discovery/playwright.config.ts')
      ).toBeInTheDocument();
      expect(screen.getByText(/#security-alerts/)).toBeInTheDocument();
    });

    it('shows run history in the flyout', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        // Run IDs (truncated to first 8 chars)
        expect(screen.getByText('run-abc-')).toBeInTheDocument();
        expect(screen.getByText('run-def-')).toBeInTheDocument();
      });
    });

    it('shows error message for failed runs', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByText('Process exited with code 1')).toBeInTheDocument();
      });
    });

    it('expands flyout when expand button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId('suiteDetailFlyout')).toBeInTheDocument();
      });

      const expandBtn = screen.getByTestId('suiteDetailFlyoutExpandBtn');
      await userEvent.click(expandBtn);

      // After clicking expand, the button should show minimize icon (aria-label changes)
      expect(screen.getByLabelText('Collapse flyout')).toBeInTheDocument();
    });

    it('shows output accordion for past runs in the timeline', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId('suiteDetailFlyout')).toBeInTheDocument();
      });

      // Both runs have output, so there should be output accordions in the timeline
      expect(screen.getAllByText(/Output \(\d+ lines\)/).length).toBeGreaterThanOrEqual(2);
    });

    it('closes flyout and opens run modal when run button is clicked', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Attack Discovery')).toBeInTheDocument();
      });

      const suiteLinks = screen.getAllByTestId('evalsSuiteName');
      await userEvent.click(suiteLinks[0]);

      await waitFor(() => {
        expect(screen.getByTestId('suiteDetailFlyout')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Run evaluation'));

      await waitFor(() => {
        // Flyout should close
        expect(screen.queryByTestId('suiteDetailFlyout')).not.toBeInTheDocument();
        // Run modal should open
        expect(screen.getByText(/Run suite/)).toBeInTheDocument();
      });
    });
  });
});
