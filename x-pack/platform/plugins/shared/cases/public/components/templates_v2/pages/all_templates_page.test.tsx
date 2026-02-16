/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AllTemplatesPage } from './all_templates_page';
import { renderWithTestingProviders, createTestQueryClient } from '../../../common/mock';
import * as api from '../api/api';

jest.mock('../api/api');

const apiMock = api as jest.Mocked<typeof api>;

describe('AllTemplatesPage', () => {
  const mockTemplatesResponse = {
    templates: [
      {
        templateId: 'template-1',
        name: 'Template 1',
        owner: 'securitySolution',
        definition: 'fields:\n  - name: field1\n    type: keyword',
        templateVersion: 1,
        deletedAt: null,
        description: 'Description 1',
        fieldCount: 5,
        tags: ['tag1', 'tag2'],
        author: 'user1',
        lastUsedAt: '2024-01-01T00:00:00.000Z',
        usageCount: 10,
        isDefault: true,
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
        tags: ['tag3'],
        author: 'user2',
        lastUsedAt: '2024-01-02T00:00:00.000Z',
        usageCount: 5,
        isDefault: false,
      },
    ],
    page: 1,
    perPage: 10,
    total: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.getTemplates.mockResolvedValue(mockTemplatesResponse);
  });

  it('renders the page correctly', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });
  });

  it('renders the header', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('all-templates-header')).toBeInTheDocument();
    });
  });

  it('renders the info panel', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-info-panel')).toBeInTheDocument();
    });
  });

  it('renders the table filters', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-filters')).toBeInTheDocument();
    });
  });

  it('renders the templates table', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });
  });

  it('displays templates in the table', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-row-template-1')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-row-template-2')).toBeInTheDocument();
    });
  });

  it('shows templates count', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-count')).toBeInTheDocument();
    });
  });

  it('calls API with search query when searching', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('templates-search'), 'test search{enter}');

    await waitFor(() => {
      expect(apiMock.getTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: expect.objectContaining({
            search: 'test search',
          }),
        })
      );
    });
  });

  it('shows clear filters button when search is active', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('templates-search'), 'test{enter}');

    await waitFor(() => {
      expect(screen.getByTestId('templates-clear-filters-link-icon')).toBeInTheDocument();
    });
  });

  it('clears filters when clear filters button is clicked', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('templates-search'), 'test{enter}');

    await waitFor(() => {
      expect(screen.getByTestId('templates-clear-filters-link-icon')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('templates-clear-filters-link-icon'));

    await waitFor(() => {
      expect(screen.queryByTestId('templates-clear-filters-link-icon')).not.toBeInTheDocument();
    });
  });

  it('shows empty prompt when no templates match search', async () => {
    const queryClient = createTestQueryClient();
    apiMock.getTemplates.mockResolvedValue({
      templates: [],
      page: 1,
      perPage: 10,
      total: 0,
    });

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });
  });

  it('calls refetch when refresh button is clicked', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    const initialCallCount = apiMock.getTemplates.mock.calls.length;

    await userEvent.click(screen.getByTestId('templates-refresh-button'));

    await waitFor(() => {
      expect(apiMock.getTemplates.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('opens the import template flyout when clicking the import button', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('template-flyout')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('import-template-button'));

    await waitFor(() => {
      expect(screen.getByTestId('template-flyout')).toBeInTheDocument();
    });
  });

  it('closes the import template flyout when clicking the cancel button', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('import-template-button'));

    await waitFor(() => {
      expect(screen.getByTestId('template-flyout')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('template-flyout-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('template-flyout')).not.toBeInTheDocument();
    });
  });

  it('selects and deselects templates via table checkboxes', async () => {
    const queryClient = createTestQueryClient();
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    // EuiBasicTable renders a "select all" checkbox + one per row.
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(1);

    // Select first row
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByTestId('templates-table-selected-count')).toBeInTheDocument();
    });
    expect(screen.getByText('Selected 1 template')).toBeInTheDocument();

    // Deselect first row
    await user.click(checkboxes[1]);
    await waitFor(() => {
      expect(screen.queryByTestId('templates-table-selected-count')).not.toBeInTheDocument();
    });
  });
});
