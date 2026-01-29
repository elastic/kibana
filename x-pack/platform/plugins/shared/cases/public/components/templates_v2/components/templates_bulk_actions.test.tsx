/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { TemplatesBulkActions } from './templates_bulk_actions';
import { renderWithTestingProviders } from '../../../common/mock';
import type { Template } from '../types';

describe('TemplatesBulkActions', () => {
  const mockTemplates: Template[] = [
    {
      key: 'template-1',
      name: 'Template 1',
      description: 'Description 1',
      solution: 'security',
      fields: 5,
      tags: ['tag1'],
      lastUpdate: '2024-01-01T00:00:00.000Z',
      lastTimeUsed: '2024-01-01T00:00:00.000Z',
      usage: 10,
      isDefault: false,
    },
    {
      key: 'template-2',
      name: 'Template 2',
      description: 'Description 2',
      solution: 'observability',
      fields: 3,
      tags: ['tag2'],
      lastUpdate: '2024-01-02T00:00:00.000Z',
      lastTimeUsed: '2024-01-02T00:00:00.000Z',
      usage: 5,
      isDefault: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no templates are selected', () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={[]} />);

    expect(screen.queryByTestId('templates-table-selected-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('templates-bulk-actions-link-icon')).not.toBeInTheDocument();
  });

  it('renders selected count when templates are selected', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    expect(await screen.findByTestId('templates-table-selected-count')).toBeInTheDocument();
    expect(screen.getByText('Selected 2 templates')).toBeInTheDocument();
  });

  it('renders singular text when one template is selected', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={[mockTemplates[0]]} />);

    expect(await screen.findByTestId('templates-table-selected-count')).toBeInTheDocument();
    expect(screen.getByText('Selected 1 template')).toBeInTheDocument();
  });

  it('renders bulk actions button', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    expect(await screen.findByTestId('templates-bulk-actions-link-icon')).toBeInTheDocument();
    expect(screen.getByText('Bulk actions')).toBeInTheDocument();
  });

  it('opens popover when bulk actions button is clicked', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await userEvent.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-actions-context-menu')).toBeInTheDocument();
    expect(screen.getByTestId('templates-bulk-action-export')).toBeInTheDocument();
    expect(screen.getByTestId('templates-bulk-action-delete')).toBeInTheDocument();
  });

  it('renders export action in popover', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await userEvent.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-action-export')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders delete action in popover', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await userEvent.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-action-delete')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
