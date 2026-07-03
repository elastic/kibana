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

jest.mock('../../hooks/use_online_eval_workflows');
jest.mock('../../hooks/use_evals_permissions');

const mockedUseOnlineEvalWorkflows = jest.mocked(useOnlineEvalWorkflows);
const mockedUseToggleOnlineEvalWorkflow = jest.mocked(useToggleOnlineEvalWorkflow);
const mockedUseDeleteOnlineEvalWorkflow = jest.mocked(useDeleteOnlineEvalWorkflow);
const mockedUseEvalsPermissions = jest.mocked(useEvalsPermissions);

const renderPage = () => {
  const history = createMemoryHistory({ initialEntries: ['/online'] });
  return render(
    <Router history={history}>
      <OnlineEvalsListPage />
    </Router>
  );
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

    const { container } = renderPage();
    const switchElement = container.querySelector(
      '[data-test-subj="onlineEvalEnabledSwitch-workflow-1"]'
    ) as HTMLButtonElement;
    fireEvent.click(switchElement);

    expect(mutate).toHaveBeenCalledWith({ workflowId: 'workflow-1', enabled: false });
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

    renderPage();

    fireEvent.click(screen.getByLabelText('Delete workflow [online-eval] quality monitor'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mutate).toHaveBeenCalledWith({ workflowId: 'workflow-1' });
  });
});
