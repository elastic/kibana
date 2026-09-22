/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowYamlPreviewFlyout } from './workflow_yaml_preview_flyout';

const mockUseWorkflow = jest.fn();

jest.mock('../../hooks/use_workflow', () => ({
  ...jest.requireActual('../../hooks/use_workflow'),
  useWorkflow: (...args: unknown[]) => mockUseWorkflow(...args),
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    'data-test-subj': dataTestSubj,
  }: {
    value: string;
    'data-test-subj'?: string;
  }) => <pre data-test-subj={dataTestSubj}>{value}</pre>,
}));

const renderFlyout = (onClose = jest.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <I18nProvider>
      <EuiProvider>
        <QueryClientProvider client={queryClient}>
          <WorkflowYamlPreviewFlyout
            workflowId="wf-1"
            workflowName="My workflow"
            onClose={onClose}
          />
        </QueryClientProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const createNotFoundError = () =>
  Object.assign(new Error('Not Found'), {
    name: 'HttpFetchError',
    request: { url: '/api/workflows/workflow/wf-1' },
    response: { status: 404 },
  });

describe('WorkflowYamlPreviewFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflow.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
  });

  it('renders the loading spinner while the workflow loads', () => {
    renderFlyout();

    expect(screen.getByTestId('contextWorkflowYamlPreviewLoading')).toBeInTheDocument();
  });

  it('loads and renders the workflow yaml preview', () => {
    mockUseWorkflow.mockReturnValue({
      data: { id: 'wf-1', yaml: 'name: preview\nsteps: []' },
      isLoading: false,
      error: null,
    });

    renderFlyout();

    expect(screen.getByTestId('contextWorkflowYamlPreviewFlyout')).toBeInTheDocument();
    expect(screen.getByText('Workflow preview: My workflow')).toBeInTheDocument();
    expect(screen.getByTestId('contextWorkflowYamlPreview')).toHaveTextContent('name: preview');
    expect(mockUseWorkflow).toHaveBeenCalledWith('wf-1');
  });

  it('shows a not-found message when the workflow was deleted', () => {
    mockUseWorkflow.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: createNotFoundError(),
    });

    renderFlyout();

    expect(screen.getByTestId('contextWorkflowYamlPreviewNotFound')).toBeInTheDocument();
    expect(screen.getByText(/no longer exists/i)).toBeInTheDocument();
    expect(screen.getByText(/wf-1/)).toBeInTheDocument();
    expect(screen.queryByTestId('contextWorkflowYamlPreviewError')).not.toBeInTheDocument();
  });

  it('shows an error when loading fails', () => {
    mockUseWorkflow.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Forbidden'),
    });

    renderFlyout();

    expect(screen.getByTestId('contextWorkflowYamlPreviewError')).toBeInTheDocument();
    expect(screen.getByText('Try again later.')).toBeInTheDocument();
    expect(screen.queryByText('Forbidden')).not.toBeInTheDocument();
  });

  it('shows a message when the workflow has no yaml content', () => {
    mockUseWorkflow.mockReturnValue({
      data: { id: 'wf-1' },
      isLoading: false,
      error: null,
    });

    renderFlyout();

    expect(screen.getByTestId('contextWorkflowYamlPreviewEmpty')).toBeInTheDocument();
    expect(screen.queryByTestId('contextWorkflowYamlPreview')).not.toBeInTheDocument();
  });
});
