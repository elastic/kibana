/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import type { Template } from '../../../../common/types/domain/template/v1';
import { TemplatesBulkActions } from './templates_bulk_actions';
import { renderWithTestingProviders } from '../../../common/mock';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('TemplatesBulkActions', () => {
  // EUI components use CSS animations that set pointer-events: none during transitions
  // Using pointerEventsCheck: 0 skips this check which is standard for testing EUI components
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  const mockTemplates: Template[] = [
    {
      templateId: 'template-1',
      name: 'Template 1',
      owner: 'securitySolution',
      definition: 'fields:\n  - name: field1\n    type: keyword',
      templateVersion: 1,
      deletedAt: null,
      description: 'Description 1',
      fieldCount: 5,
      tags: ['tag1'],
      author: 'user1',
      lastUsedAt: '2024-01-01T00:00:00.000Z',
      usageCount: 10,
      isDefault: false,
    },
    {
      templateId: 'template-2',
      name: 'Template 2',
      owner: 'observability',
      definition: 'fields:\n  - name: field2\n    type: keyword',
      templateVersion: 1,
      deletedAt: null,
      description: 'Description 2',
      fieldCount: 3,
      tags: ['tag2'],
      author: 'user2',
      lastUsedAt: '2024-01-02T00:00:00.000Z',
      usageCount: 5,
      isDefault: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.bulkDeleteTemplates.mockResolvedValue({
      success: true,
      deleted: ['template-1', 'template-2'],
      errors: [],
    });
    apiMock.bulkExportTemplates.mockResolvedValue({
      filename: 'templates-bulk-export.yaml',
      content: 'mock content',
    });
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

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-actions-context-menu')).toBeInTheDocument();
    expect(screen.getByTestId('templates-bulk-action-export')).toBeInTheDocument();
    expect(screen.getByTestId('templates-bulk-action-delete')).toBeInTheDocument();
  });

  it('renders export action in popover', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-action-export')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders delete action in popover', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));

    expect(await screen.findByTestId('templates-bulk-action-delete')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls bulkExportTemplates when export action is clicked', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-export'));

    await waitFor(() => {
      expect(apiMock.bulkExportTemplates).toHaveBeenCalledWith({
        templateIds: ['template-1', 'template-2'],
      });
    });
  });

  it('shows confirmation modal when delete action is clicked', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));

    expect(await screen.findByText('Delete 2 templates?')).toBeInTheDocument();
    expect(
      screen.getByText('This action will permanently delete these 2 templates.')
    ).toBeInTheDocument();
  });

  it('shows singular text in confirmation modal when one template is selected', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={[mockTemplates[0]]} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));

    expect(await screen.findByText('Delete 1 template?')).toBeInTheDocument();
    expect(
      screen.getByText('This action will permanently delete this template.')
    ).toBeInTheDocument();
  });

  it('calls bulkDeleteTemplates when deletion is confirmed', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));

    expect(await screen.findByText('Delete 2 templates?')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(apiMock.bulkDeleteTemplates).toHaveBeenCalledWith({
        templateIds: ['template-1', 'template-2'],
      });
    });
  });

  it('closes confirmation modal when cancel is clicked', async () => {
    renderWithTestingProviders(<TemplatesBulkActions selectedTemplates={mockTemplates} />);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));

    expect(await screen.findByText('Delete 2 templates?')).toBeInTheDocument();

    await user.click(screen.getByTestId('confirmModalCancelButton'));

    await waitFor(() => {
      expect(screen.queryByText('Delete 2 templates?')).not.toBeInTheDocument();
    });

    expect(apiMock.bulkDeleteTemplates).not.toHaveBeenCalled();
  });

  it('calls onActionSuccess callback after successful bulk delete', async () => {
    const onActionSuccess = jest.fn();
    renderWithTestingProviders(
      <TemplatesBulkActions selectedTemplates={mockTemplates} onActionSuccess={onActionSuccess} />
    );

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));

    await waitFor(() => {
      expect(screen.getByText('Delete 2 templates?')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onActionSuccess).toHaveBeenCalled();
    });
  });
});
