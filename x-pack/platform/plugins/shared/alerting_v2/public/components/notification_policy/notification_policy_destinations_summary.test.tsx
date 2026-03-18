/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NotificationPolicyDestination } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { NotificationPolicyDestinationsSummary } from './notification_policy_destinations_summary';

const mockGetUrlForApp = jest.fn();
const mockApplicationService = { getUrlForApp: mockGetUrlForApp };
const mockUseFetchWorkflow = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return mockApplicationService;
    }

    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (...args: unknown[]) => mockUseFetchWorkflow(...args),
}));

const renderComponent = (destinations: NotificationPolicyDestination[]) =>
  render(
    <I18nProvider>
      <NotificationPolicyDestinationsSummary destinations={destinations} />
    </I18nProvider>
  );

describe('NotificationPolicyDestinationsSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockImplementation((_appId: string, { path }: { path: string }) => {
      return `/app/workflows${path}`;
    });
    mockUseFetchWorkflow.mockImplementation((id: string) => ({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      ...(id === 'workflow-1'
        ? {
            data: {
              id: 'workflow-1',
              name: 'Workflow One',
            },
          }
        : {}),
    }));
  });

  it('renders a dash when there are no destinations', () => {
    renderComponent([]);

    expect(screen.getByText('-')).toBeDefined();
  });

  it('renders the workflow count summary', () => {
    renderComponent([
      { type: 'workflow', id: 'workflow-1' },
      { type: 'workflow', id: 'workflow-2' },
      { type: 'workflow', id: 'workflow-3' },
    ]);

    expect(screen.getByText('3 workflows')).toBeDefined();
  });

  it('opens a popover with workflow links, using names when available and ids as fallback', async () => {
    renderComponent([
      { type: 'workflow', id: 'workflow-1' },
      { type: 'workflow', id: 'workflow-2' },
    ]);

    fireEvent.click(screen.getByText('2 workflows'));

    const resolvedWorkflowText = await screen.findByText('Workflow One');
    const resolvedWorkflowLink = resolvedWorkflowText.closest('a');
    expect(resolvedWorkflowLink?.href).toBe('http://localhost/app/workflows/workflow-1');
    expect(resolvedWorkflowLink?.target).toBe('_blank');

    const fallbackWorkflowText = screen.getByText('workflow-2');
    const fallbackWorkflowLink = fallbackWorkflowText.closest('a');
    expect(fallbackWorkflowLink?.href).toBe('http://localhost/app/workflows/workflow-2');
    expect(fallbackWorkflowLink?.target).toBe('_blank');

    expect(mockUseFetchWorkflow).toHaveBeenCalledWith('workflow-1', true);
    expect(mockUseFetchWorkflow).toHaveBeenCalledWith('workflow-2', true);
  });
});
