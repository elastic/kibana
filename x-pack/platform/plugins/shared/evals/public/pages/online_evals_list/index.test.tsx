/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { OnlineEvalsListPage } from '.';
import type { OnlineEvalWorkflowListItem } from '../../hooks/use_online_eval_workflows';
import {
  useDeleteOnlineEvalWorkflow,
  useOnlineEvalWorkflows,
  useToggleOnlineEvalWorkflow,
} from '../../hooks/use_online_eval_workflows';
import { useEvalsPermissions } from '../../hooks/use_evals_permissions';
import { useModelConnectors } from '../../hooks/use_model_connectors';

jest.mock('../../hooks/use_online_eval_workflows');
jest.mock('../../hooks/use_evals_permissions');
jest.mock('../../hooks/use_model_connectors');
jest.mock('../../components/create_online_eval_flyout', () => ({
  CreateOnlineEvalFlyout: ({ onClose }: { onClose: () => void }) => (
    <div data-test-subj="createOnlineEvalFlyoutMock">
      <button onClick={onClose} type="button">
        close
      </button>
      create flyout mock
    </div>
  ),
}));

const mockedUseOnlineEvalWorkflows = jest.mocked(useOnlineEvalWorkflows);
const mockedUseToggleOnlineEvalWorkflow = jest.mocked(useToggleOnlineEvalWorkflow);
const mockedUseDeleteOnlineEvalWorkflow = jest.mocked(useDeleteOnlineEvalWorkflow);
const mockedUseEvalsPermissions = jest.mocked(useEvalsPermissions);
const mockedUseModelConnectors = jest.mocked(useModelConnectors);

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/online'] });
  const view = render(
    <Router history={history}>
      <OnlineEvalsListPage />
    </Router>
  );
  return { ...view, history };
};

const buildWorkflow = (
  overrides: Partial<OnlineEvalWorkflowListItem> = {}
): OnlineEvalWorkflowListItem => ({
  id: 'workflow-1',
  name: '[online-eval] quality monitor',
  enabled: true,
  yaml: 'version: "1"',
  parsedConfig: {
    name: 'quality monitor',
    indexPattern: 'traces-agent_builder.otel-default',
    windowMinutes: 60,
    lagMinutes: 15,
    maxTracesPerRun: 25,
    every: '1h',
    evaluators: [{ name: 'correctness' }],
    connectorId: 'connector-1',
  },
  ...overrides,
});

describe('OnlineEvalsListPage', () => {
  beforeEach(() => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: true });
    mockedUseModelConnectors.mockReturnValue({
      connectors: [{ id: 'connector-1', name: 'Judge connector' }],
      isLoading: false,
      error: null,
    });
    mockedUseToggleOnlineEvalWorkflow.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useToggleOnlineEvalWorkflow>);
    mockedUseDeleteOnlineEvalWorkflow.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useDeleteOnlineEvalWorkflow>);
  });

  it('renders workflow rows from the workflows API', () => {
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 1,
        workflows: [buildWorkflow()],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    renderPage();

    expect(screen.getByText('[online-eval] quality monitor')).toBeInTheDocument();
    expect(screen.getByText('1h')).toBeInTheDocument();
    expect(screen.getByText('correctness')).toBeInTheDocument();
    expect(screen.getByText('60m window / 15m lag / max 25 traces')).toBeInTheDocument();
  });

  it('calls PUT toggle mutation when enabled switch changes', () => {
    const mutate = jest.fn();
    mockedUseToggleOnlineEvalWorkflow.mockReturnValue({
      mutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useToggleOnlineEvalWorkflow>);
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 1,
        workflows: [buildWorkflow()],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container, history } = renderPage();
    const switchElement = container.querySelector(
      '[data-test-subj="onlineEvalEnabledSwitch-workflow-1"]'
    ) as HTMLButtonElement;
    fireEvent.click(switchElement);

    expect(mutate).toHaveBeenCalledWith({ workflowId: 'workflow-1', enabled: false });
    expect(history.location.pathname).toBe('/online');
  });

  it('calls DELETE mutation after confirm modal submit', () => {
    const mutate = jest.fn();
    mockedUseDeleteOnlineEvalWorkflow.mockReturnValue({
      mutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useDeleteOnlineEvalWorkflow>);
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 1,
        workflows: [buildWorkflow()],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { history } = renderPage();

    fireEvent.click(screen.getByLabelText('Delete workflow [online-eval] quality monitor'));
    expect(history.location.pathname).toBe('/online');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mutate).toHaveBeenCalledWith({ workflowId: 'workflow-1' });
  });

  it('shows actionable empty-state CTA and opens create flyout when connectors exist', () => {
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 0,
        workflows: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container } = renderPage();

    fireEvent.click(
      container.querySelector('[data-test-subj="createOnlineEvalEmptyStateButton"]') as HTMLElement
    );
    expect(screen.getByText('create flyout mock')).toBeInTheDocument();
  });

  it('shows warning callout and no empty-state CTA when no connectors exist', () => {
    mockedUseModelConnectors.mockReturnValue({
      connectors: [],
      isLoading: false,
      error: null,
    });
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 0,
        workflows: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container } = renderPage();

    expect(screen.getByText('No AI connector configured')).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="createOnlineEvalEmptyStateButton"]')
    ).not.toBeInTheDocument();
  });

  it('links to tracing projects from empty-state actions', () => {
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 0,
        workflows: [],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container, history } = renderPage();

    fireEvent.click(
      container.querySelector(
        '[data-test-subj="onlineEvalsEmptyStateTracingButton"]'
      ) as HTMLElement
    );
    expect(history.location.pathname).toBe('/tracing');
  });

  it('shows privilege warning callout when manage permission is missing', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: false });
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 1,
        workflows: [buildWorkflow()],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container } = renderPage();

    expect(
      screen.getByText('You need additional privileges to manage online evaluations')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="onlineEvalsListNoPermissionCallout"]')
    ).toBeInTheDocument();
  });

  it('does not show privilege warning callout when manage permission exists', () => {
    mockedUseEvalsPermissions.mockReturnValue({ canRead: true, canManage: true });
    mockedUseOnlineEvalWorkflows.mockReturnValue({
      data: {
        page: 1,
        size: 10,
        total: 1,
        workflows: [buildWorkflow()],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useOnlineEvalWorkflows>);

    const { container } = renderPage();

    expect(
      screen.queryByText('You need additional privileges to manage online evaluations')
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="onlineEvalsListNoPermissionCallout"]')
    ).not.toBeInTheDocument();
  });
});
