/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, createEvent, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { CASES_TEMPLATE_DELETED_EVENT_TYPE } from '../../../../common/constants';
import { AllTemplatesPage } from './all_templates_page';
import {
  createTestQueryClient,
  mockedTestProvidersOwner,
  renderWithTestingProviders,
} from '../../../common/mock';
import { KibanaServices } from '../../../common/lib/kibana';
import type { BulkDeleteTemplatesResponse } from '../types';
import * as api from '../api/api';

jest.mock('../api/api');

jest.mock('../../use_breadcrumbs', () => ({
  useCasesTemplatesBreadcrumbs: jest.fn(),
}));

const mockNavigateToAllCases = jest.fn();
const mockNavigateToCasesCreateTemplate = jest.fn();
const mockNavigateToCasesEditTemplate = jest.fn();

jest.mock('../../../common/navigation/hooks', () => ({
  useAllCasesNavigation: () => ({
    getAllCasesUrl: jest.fn().mockReturnValue('/'),
    navigateToAllCases: mockNavigateToAllCases,
  }),
  useCasesCreateTemplateNavigation: () => ({
    getCasesCreateTemplateUrl: jest.fn().mockReturnValue('/templates/create'),
    navigateToCasesCreateTemplate: mockNavigateToCasesCreateTemplate,
  }),
  useCasesFieldLibraryNavigation: () => ({
    getCasesFieldLibraryUrl: jest.fn().mockReturnValue('/field-library'),
    navigateToCasesFieldLibrary: jest.fn(),
  }),
}));

jest.mock('../../../common/navigation', () => ({
  useCasesCreateTemplateNavigation: () => ({
    getCasesCreateTemplateUrl: jest.fn().mockReturnValue('/templates/create'),
    navigateToCasesCreateTemplate: mockNavigateToCasesCreateTemplate,
  }),
  useCasesEditTemplateNavigation: () => ({
    getCasesEditTemplateUrl: jest.fn().mockReturnValue('/templates/edit'),
    navigateToCasesEditTemplate: mockNavigateToCasesEditTemplate,
  }),
  useCasesFieldLibraryNavigation: () => ({
    getCasesFieldLibraryUrl: jest.fn().mockReturnValue('/field-library'),
    navigateToCasesFieldLibrary: jest.fn(),
  }),
}));

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
        fieldSearchMatches: false,
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
        fieldSearchMatches: false,
      },
    ],
    page: 1,
    perPage: 10,
    total: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiMock.getTemplates.mockResolvedValue(mockTemplatesResponse);
    // clearAllMocks keeps implementations, so reset this one: the tests below install a promise they
    // resolve by hand, which any later test would otherwise inherit as a delete that never settles.
    apiMock.bulkDeleteTemplates.mockResolvedValue({ success: true, deleted: [], errors: [] });
    jest
      .spyOn(KibanaServices, 'getConfig')
      .mockReturnValue({ templates: { enabled: true } } as ReturnType<
        typeof KibanaServices.getConfig
      >);
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

    expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId('create-template-button')).toBeInTheDocument();
  });

  it('navigates to all cases and prevents the anchor default navigation on back click', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    const backButton = await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.back);
    const clickEvent = createEvent.click(backButton);
    fireEvent(backButton, clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
    expect(mockNavigateToAllCases).toHaveBeenCalled();
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

  it('hides the info panel when dismissed', async () => {
    const queryClient = createTestQueryClient();

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-info-panel')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('templates-info-panel-dismiss'));

    expect(screen.queryByTestId('templates-info-panel')).not.toBeInTheDocument();
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

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('import-template-button'));

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

    await openAppMenuOverflow();
    await userEvent.click(await screen.findByTestId('import-template-button'));

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

  it('reports no template management event on page load alone', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    // Loading and listing templates is not a management action.
    expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('reports exactly one deleted event for a confirmed row delete', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    apiMock.bulkDeleteTemplates.mockResolvedValue({
      success: true,
      deleted: ['template-1'],
      errors: [],
    });

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('template-action-popover-button-template-1'));
    await user.click(await screen.findByTestId('template-action-delete-template-1'));
    await user.click(await screen.findByTestId('confirmModalConfirmButton'));

    // This drives the real mutation, so every callback React Query runs for a success runs here.
    // A report in more than one of them would show up as a second event.
    await waitFor(() => {
      expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    });
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
      CASES_TEMPLATE_DELETED_EVENT_TYPE,
      {
        owner: mockedTestProvidersOwner[0],
        entry_point: 'templates_list',
        delete_scope: 'single',
      }
    );
  });

  it('reports nothing when a confirmed row delete fails', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    apiMock.bulkDeleteTemplates.mockRejectedValue(new Error('Delete failed'));

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('template-action-popover-button-template-1'));
    await user.click(await screen.findByTestId('template-action-delete-template-1'));
    await user.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(apiMock.bulkDeleteTemplates).toHaveBeenCalled();
    });

    expect(coreStart.analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('reports one bulk delete event and still clears the selection', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    apiMock.bulkDeleteTemplates.mockResolvedValue({
      success: true,
      deleted: ['template-1', 'template-2'],
      errors: [],
    });

    renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));
    await user.click(await screen.findByTestId('confirmModalConfirmButton'));

    // The deselect and the report share one callback now, so neither may cancel the other. This
    // test also passes on the old per-call wiring, because the component renders null on an empty
    // selection rather than unmounting. The two tests below are the ones that pin the fix.
    await waitFor(() => {
      expect(screen.queryByTestId('templates-table-selected-count')).not.toBeInTheDocument();
    });

    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
      CASES_TEMPLATE_DELETED_EVENT_TYPE,
      {
        owner: mockedTestProvidersOwner[0],
        entry_point: 'templates_list',
        delete_scope: 'bulk',
      }
    );
  });

  it('reports a row delete that the server confirms after the page unmounts', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const deferred: { resolve: (value: BulkDeleteTemplatesResponse) => void } = {
      resolve: () => {},
    };
    apiMock.bulkDeleteTemplates.mockReturnValue(
      new Promise((resolve) => {
        deferred.resolve = resolve;
      })
    );

    const { unmount } = renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('template-action-popover-button-template-1'));
    await user.click(await screen.findByTestId('template-action-delete-template-1'));
    await user.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(apiMock.bulkDeleteTemplates).toHaveBeenCalled();
    });

    // The user leaves the page while the delete is still in flight.
    unmount();

    await act(async () => {
      deferred.resolve({ success: true, deleted: ['template-1'], errors: [] });
    });

    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
      CASES_TEMPLATE_DELETED_EVENT_TYPE,
      {
        owner: mockedTestProvidersOwner[0],
        entry_point: 'templates_list',
        delete_scope: 'single',
      }
    );
  });

  it('reports a bulk delete that the server confirms after the page unmounts', async () => {
    const queryClient = createTestQueryClient();
    const coreStart = coreMock.createStart() as unknown as CoreStart;
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const deferred: { resolve: (value: BulkDeleteTemplatesResponse) => void } = {
      resolve: () => {},
    };
    apiMock.bulkDeleteTemplates.mockReturnValue(
      new Promise((resolve) => {
        deferred.resolve = resolve;
      })
    );

    const { unmount } = renderWithTestingProviders(<AllTemplatesPage />, {
      wrapperProps: { queryClient, coreStart },
    });

    await waitFor(() => {
      expect(screen.getByTestId('templates-table')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await user.click(await screen.findByTestId('templates-bulk-actions-link-icon'));
    await user.click(await screen.findByTestId('templates-bulk-action-delete'));
    await user.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(apiMock.bulkDeleteTemplates).toHaveBeenCalled();
    });

    unmount();

    await act(async () => {
      deferred.resolve({ success: true, deleted: ['template-1', 'template-2'], errors: [] });
    });

    expect(coreStart.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(coreStart.analytics.reportEvent).toHaveBeenCalledWith(
      CASES_TEMPLATE_DELETED_EVENT_TYPE,
      {
        owner: mockedTestProvidersOwner[0],
        entry_point: 'templates_list',
        delete_scope: 'bulk',
      }
    );
  });
});
