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
import { TemplatesTableSettings } from './templates_table_settings';
import { renderWithTestingProviders } from '../../../common/mock';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('TemplatesTableSettings', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const mockTemplate: Template = {
    templateId: 'template-1',
    name: 'Template 1',
    owner: 'securitySolution',
    definition: 'fields:\n  - name: field1\n    type: keyword',
    templateVersion: 1,
    deletedAt: null,
    description: 'Description',
    fieldCount: 5,
    tags: ['tag1'],
    author: 'user1',
    lastUsedAt: '2024-01-01T00:00:00.000Z',
    usageCount: 10,
    isDefault: false,
  };

  const defaultProps = {
    rangeStart: 1,
    rangeEnd: 10,
    totalTemplates: 25,
    selectedTemplates: [] as Template[],
    onBulkActionSuccess: jest.fn(),
    hasFilters: false,
    onClearFilters: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    jest.clearAllMocks();
    apiMock.bulkDeleteTemplates?.mockResolvedValue?.({ success: true, deleted: [], errors: [] });
    apiMock.bulkExportTemplates?.mockResolvedValue?.({
      filename: 'templates-export.yaml',
      content: 'mock',
    });
  });

  it('renders the templates count', async () => {
    renderWithTestingProviders(<TemplatesTableSettings {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-count')).toBeInTheDocument();
    });
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
    expect(screen.getByText(/1-10/)).toBeInTheDocument();
    expect(screen.getByText(/of 25/)).toBeInTheDocument();
  });

  it('does not render clear filters button when hasFilters is false', async () => {
    renderWithTestingProviders(<TemplatesTableSettings {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-count')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('templates-clear-filters-link-icon')).not.toBeInTheDocument();
  });

  it('renders clear filters button when hasFilters is true', async () => {
    renderWithTestingProviders(<TemplatesTableSettings {...defaultProps} hasFilters />);

    await waitFor(() => {
      expect(screen.getByTestId('templates-clear-filters-link-icon')).toBeInTheDocument();
    });
    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('calls onClearFilters when clear filters button is clicked', async () => {
    const onClearFilters = jest.fn();
    renderWithTestingProviders(
      <TemplatesTableSettings {...defaultProps} hasFilters onClearFilters={onClearFilters} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-clear-filters-link-icon')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('templates-clear-filters-link-icon'));

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('renders bulk actions when templates are selected', async () => {
    renderWithTestingProviders(
      <TemplatesTableSettings {...defaultProps} selectedTemplates={[mockTemplate]} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-selected-count')).toBeInTheDocument();
    });
    expect(screen.getByText('Selected 1 template')).toBeInTheDocument();
  });

  it('passes onBulkActionSuccess to TemplatesBulkActions', async () => {
    const onBulkActionSuccess = jest.fn();
    apiMock.bulkDeleteTemplates?.mockResolvedValue?.({
      success: true,
      deleted: ['template-1'],
      errors: [],
    });

    renderWithTestingProviders(
      <TemplatesTableSettings
        {...defaultProps}
        selectedTemplates={[mockTemplate]}
        onBulkActionSuccess={onBulkActionSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('templates-bulk-actions-link-icon')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('templates-bulk-actions-link-icon'));
    await user.click(screen.getByTestId('templates-bulk-action-delete'));

    await waitFor(() => {
      expect(screen.getByText('Delete 1 template?')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onBulkActionSuccess).toHaveBeenCalled();
    });
  });
});
