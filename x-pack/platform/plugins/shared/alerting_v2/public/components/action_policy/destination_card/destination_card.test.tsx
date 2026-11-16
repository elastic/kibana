/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyDestination } from '@kbn/alerting-v2-schemas';
import { DestinationCard } from './destination_card';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const mockUseFetchWorkflow = jest.fn();

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (...args: unknown[]) => mockUseFetchWorkflow(...args),
}));

const successState = (id: string, overrides: object = {}) => ({
  data: {
    id,
    name: `Workflow ${id}`,
    definition: {
      steps: [
        { type: '.email', name: 'send email' },
        { type: '.slack', name: 'send slack' },
      ],
    },
    ...overrides,
  },
  isLoading: false,
  isError: false,
  error: null,
});

const errorState = (status: number) => ({
  data: undefined,
  isLoading: false,
  isError: true,
  error: Object.assign(new Error(`HTTP ${status}`), { response: { status } }),
});

const renderCard = (destination: ActionPolicyDestination) =>
  render(
    <I18nProvider>
      <DestinationCard destination={destination} />
    </I18nProvider>
  );

describe('DestinationCard', () => {
  beforeEach(() => {
    mockUseFetchWorkflow.mockReset();
    mockUseFetchWorkflow.mockImplementation((id: string) => successState(id));
  });

  it('fetches the workflow without an error toast', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(mockUseFetchWorkflow).toHaveBeenCalledWith('wf-42', true, { notifyOnError: false });
  });

  it('renders a loading state while the workflow is fetched', () => {
    mockUseFetchWorkflow.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPolicyDestinationCardTitle')).toBeNull();
    expect(screen.getByTestId('actionPolicyDestinationCardLink')).toHaveAttribute(
      'href',
      '/app/workflows/wf-42'
    );
  });

  it('renders a not found message when the workflow does not exist', () => {
    mockUseFetchWorkflow.mockReturnValue(errorState(404));
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardTitle')).toHaveTextContent('wf-42');
    expect(screen.getByTestId('actionPolicyDestinationCardNotFound')).toHaveTextContent(
      'Workflow not found. It may have been deleted.'
    );
    expect(screen.queryByTestId('actionPolicyDestinationCardError')).toBeNull();
    expect(screen.getByTestId('actionPolicyDestinationCardLink')).toBeInTheDocument();
  });

  it('renders a load error message when the workflow fails to load', () => {
    mockUseFetchWorkflow.mockReturnValue(errorState(500));
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardTitle')).toHaveTextContent('wf-42');
    expect(screen.getByTestId('actionPolicyDestinationCardError')).toHaveTextContent(
      'Unable to load workflow details'
    );
    expect(screen.queryByTestId('actionPolicyDestinationCardNotFound')).toBeNull();
    expect(screen.queryByTestId('actionPolicyDestinationConnectorIcons')).toBeNull();
    expect(screen.getByTestId('actionPolicyDestinationCardLink')).toBeInTheDocument();
  });

  it('keeps the cached workflow when a background refetch fails', () => {
    mockUseFetchWorkflow.mockReturnValue({
      ...errorState(500),
      data: successState('wf-42').data,
    });
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardTitle')).toHaveTextContent(
      'Workflow wf-42'
    );
    expect(screen.queryByTestId('actionPolicyDestinationCardError')).toBeNull();
  });

  it('renders a not found message when a refetch finds the workflow deleted', () => {
    mockUseFetchWorkflow.mockReturnValue({
      ...errorState(404),
      data: successState('wf-42').data,
    });
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardNotFound')).toBeInTheDocument();
  });

  it('renders a workflow card with the workflow name in bold', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCard')).toBeInTheDocument();
    expect(screen.getByTestId('actionPolicyDestinationCardTitle')).toBeInTheDocument();
    expect(screen.getByText('Workflow wf-42')).toBeInTheDocument();
  });

  it('does not render the name as a link', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.queryByRole('link', { name: 'Workflow wf-42' })).toBeNull();
  });

  it('renders the connector icons for the workflow steps', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationConnectorIcons')).toBeInTheDocument();
  });

  it('renders the connector icons for a workflow with only a console step', () => {
    mockUseFetchWorkflow.mockReturnValue(
      successState('wf-console', { definition: { steps: [{ type: 'console', name: 'log' }] } })
    );
    renderCard({ type: 'workflow', id: 'wf-console' });

    const icons = screen.getByTestId('actionPolicyDestinationConnectorIcons');
    expect(icons.children.length).toBe(1);
  });

  it('renders a link button pointing to the workflow URL', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    const link = screen.getByTestId('actionPolicyDestinationCardLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/workflows/wf-42');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the workflow description when present', () => {
    mockUseFetchWorkflow.mockReturnValue(
      successState('wf-42', { description: 'Sends alerts to email and Slack' })
    );
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardDescription')).toHaveTextContent(
      'Sends alerts to email and Slack'
    );
  });

  it('does not render a description element when description is absent', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.queryByTestId('actionPolicyDestinationCardDescription')).toBeNull();
  });

  it('renders nothing for a non-workflow destination type', () => {
    const { container } = renderCard({ type: 'unknown' as any, id: 'x' });
    expect(container).toBeEmptyDOMElement();
  });
});
