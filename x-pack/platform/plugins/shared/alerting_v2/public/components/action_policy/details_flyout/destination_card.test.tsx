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
    if (token === 'http') {
      return {
        basePath: { prepend: (path: string) => `/base${path}` },
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const mockWorkflowData: Record<string, object> = {};

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (id: string) => ({
    data: {
      id,
      name: `Workflow ${id}`,
      definition: {
        steps: [
          { type: '.email', name: 'send email' },
          { type: '.slack', name: 'send slack' },
        ],
      },
      ...mockWorkflowData[id],
    },
    isLoading: false,
  }),
}));

const renderCard = (destination: ActionPolicyDestination) =>
  render(
    <I18nProvider>
      <DestinationCard destination={destination} />
    </I18nProvider>
  );

describe('DestinationCard', () => {
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

  it('renders a link button pointing to the workflow URL', () => {
    renderCard({ type: 'workflow', id: 'wf-42' });

    const link = screen.getByTestId('actionPolicyDestinationCardLink');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/app/workflows/wf-42');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the workflow description when present', () => {
    mockWorkflowData['wf-42'] = { description: 'Sends alerts to email and Slack' };
    renderCard({ type: 'workflow', id: 'wf-42' });

    expect(screen.getByTestId('actionPolicyDestinationCardDescription')).toHaveTextContent(
      'Sends alerts to email and Slack'
    );
    delete mockWorkflowData['wf-42'];
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
