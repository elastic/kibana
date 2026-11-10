/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowListDto } from '@kbn/workflows';
import { renderWorkflowOption, toWorkflowComboOption } from './workflow_option';

type WorkflowListItem = WorkflowListDto['results'][number];

const createWorkflow = (overrides: Partial<WorkflowListItem> = {}): WorkflowListItem => ({
  id: 'workflow-1',
  name: 'Slack notification workflow',
  description: 'Sends alerts to Slack',
  enabled: true,
  definition: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  history: [],
  valid: true,
  ...overrides,
});

const renderOption = (workflow: WorkflowListItem, searchValue = '') =>
  render(
    <I18nProvider>
      {renderWorkflowOption(toWorkflowComboOption(workflow), searchValue)}
    </I18nProvider>
  );

describe('toWorkflowComboOption', () => {
  it('maps the workflow name to the label and exposes the id', () => {
    const option = toWorkflowComboOption(createWorkflow());

    expect(option).toMatchObject({
      key: 'workflow-1',
      label: 'Slack notification workflow',
      value: { id: 'workflow-1' },
    });
  });

  it('disables the option when the workflow is disabled', () => {
    expect(toWorkflowComboOption(createWorkflow({ enabled: false })).disabled).toBe(true);
    expect(toWorkflowComboOption(createWorkflow({ enabled: true })).disabled).toBe(false);
  });
});

describe('renderWorkflowOption', () => {
  it('renders the name and description', () => {
    renderOption(createWorkflow());

    expect(screen.getByText('Slack notification workflow')).toBeInTheDocument();
    expect(screen.getByText('Sends alerts to Slack')).toBeInTheDocument();
  });

  it('falls back to a placeholder when the description is empty', () => {
    renderOption(createWorkflow({ description: '' }));

    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('renders the managed badge only for managed workflows', () => {
    const { unmount } = renderOption(createWorkflow({ managed: true }));
    expect(screen.getByText('Managed')).toBeInTheDocument();
    unmount();

    renderOption(createWorkflow({ managed: false }));
    expect(screen.queryByText('Managed')).not.toBeInTheDocument();
  });

  it('lists the tags as text after the description', () => {
    renderOption(
      createWorkflow({
        definition: {
          version: '1',
          name: 'Slack notification workflow',
          enabled: true,
          triggers: [],
          steps: [],
          tags: ['slack', 'alerts'],
        },
      })
    );

    expect(screen.getByTestId('workflowOptionDetails')).toHaveTextContent(
      'Sends alerts to Slack · Tags: slack, alerts'
    );
  });

  it('omits the tags when the workflow has none', () => {
    renderOption(createWorkflow());

    expect(screen.getByTestId('workflowOptionDetails')).toHaveTextContent(
      /^Sends alerts to Slack$/
    );
  });

  it('renders no focusable elements inside the option', () => {
    const { container } = renderOption(
      createWorkflow({
        managed: true,
        enabled: false,
        definition: {
          version: '1',
          name: 'Slack notification workflow',
          enabled: false,
          triggers: [],
          steps: [],
          tags: ['slack'],
        },
      })
    );

    expect(container.querySelector('[tabindex], button, a')).toBeNull();
  });

  it('marks disabled workflows with a badge', () => {
    renderOption(createWorkflow({ enabled: false }));

    expect(screen.getByTestId('workflowOptionDisabledBadge')).toHaveTextContent('Disabled');
  });

  it('does not mark enabled workflows as disabled', () => {
    renderOption(createWorkflow());

    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
  });
});
