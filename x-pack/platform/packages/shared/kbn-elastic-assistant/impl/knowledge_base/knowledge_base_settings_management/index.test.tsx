/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import { KnowledgeBaseSettingsManagement } from '.';
import { useCreateKnowledgeBaseEntry } from '../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry';
import { useDeleteKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries';
import { useFlyoutModalVisibility } from '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import {
  isKnowledgeBaseSetup,
  useKnowledgeBaseStatus,
} from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSettingsUpdater } from '../../assistant/settings/use_settings_updater/use_settings_updater';
import { useUpdateKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries';
import { MOCK_QUICK_PROMPTS } from '../../mock/quick_prompt';
import { useAssistantContext } from '../../..';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKnowledgeBaseIndices } from '../../assistant/api/knowledge_base/use_knowledge_base_indices';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory, History } from 'history';

const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab: jest.fn(),
  http: {
    get: jest.fn(),
  },
  selectedSettingsTab: null,
  assistantAvailability: {
    isAssistantEnabled: true,
    hasManageGlobalKnowledgeBase: true,
  },
};
jest.mock('../../assistant_context');
jest.mock('../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry');
jest.mock('../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries');
jest.mock('../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries');

jest.mock('../../assistant/settings/use_settings_updater/use_settings_updater');
jest.mock('../../assistant/api/knowledge_base/use_knowledge_base_indices');
jest.mock('../../assistant/api/knowledge_base/use_knowledge_base_status');
jest.mock('../../assistant/api/knowledge_base/entries/use_knowledge_base_entries');
jest.mock(
  '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility'
);
const mockDataViews = {
  getFieldsForWildcard: jest.fn().mockResolvedValue([
    { name: 'field-1', esTypes: ['semantic_text'] },
    { name: 'field-2', esTypes: ['text'] },
    { name: 'field-3', esTypes: ['semantic_text'] },
  ]),
  getExistingIndices: jest.fn().mockResolvedValue(['index-2']),
} as unknown as DataViewsContract;
const queryClient = new QueryClient();
const Wrapper = ({
  children,
  history = createMemoryHistory(),
}: {
  children: React.ReactNode;
  history?: History;
}) => (
  <I18nProvider>
    <Router history={history}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Router>
  </I18nProvider>
);
describe('KnowledgeBaseSettingsManagement', () => {
  const mockCreateEntry = jest.fn();
  const mockUpdateEntry = jest.fn();
  const mockDeleteEntry = jest.fn();
  const mockData = [
    {
      id: '1',
      createdAt: '2024-10-21T18:54:14.773Z',
      createdBy: 'u_user_id_1',
      updatedAt: '2024-10-23T17:33:15.933Z',
      updatedBy: 'u_user_id_1',
      users: [{ name: 'Test User 1' }],
      name: 'Test Entry 1',
      namespace: 'default',
      type: 'document',
      kbResource: 'user',
      source: 'user',
      text: 'Very nice text',
    },
    {
      id: '2',
      createdAt: '2024-10-25T09:55:56.596Z',
      createdBy: 'u_user_id_2',
      updatedAt: '2024-10-25T09:55:56.596Z',
      updatedBy: 'u_user_id_2',
      users: [],
      name: 'Test Entry 2',
      namespace: 'default',
      type: 'index',
      index: 'index-1',
      field: 'semantic_field1',
      description: 'Test description',
      queryDescription: 'Test query instruction',
    },
    {
      id: '3',
      createdAt: '2024-10-25T09:55:56.596Z',
      createdBy: 'u_user_id_1',
      updatedAt: '2024-10-25T09:55:56.596Z',
      updatedBy: 'u_user_id_1',
      users: [{ name: 'Test User 1' }],
      name: 'Test Entry 3',
      namespace: 'default',
      type: 'index',
      index: 'index-2',
      field: 'semantic_field2',
      description: 'Test description',
      queryDescription: 'Test query instruction',
    },
    {
      id: '4',
      createdAt: '2024-10-21T18:54:14.773Z',
      createdBy: 'u_user_id_3',
      updatedAt: '2024-10-23T17:33:15.933Z',
      updatedBy: 'u_user_id_3',
      users: [],
      name: 'Test Entry 4',
      namespace: 'default',
      type: 'document',
      kbResource: 'user',
      source: 'user',
      text: 'Very nice text',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useAssistantContext as jest.Mock).mockImplementation(() => mockContext);
    (useSettingsUpdater as jest.Mock).mockReturnValue({
      knowledgeBase: { latestAlerts: 20 },
      setUpdatedKnowledgeBaseSettings: jest.fn(),
      resetSettings: jest.fn(),
      saveSettings: jest.fn(),
    });
    (isKnowledgeBaseSetup as jest.Mock).mockReturnValue(true);
    (useKnowledgeBaseStatus as jest.Mock).mockReturnValue({
      data: {
        elser_exists: true,
        security_labs_exists: true,
        index_exists: true,
        pipeline_exists: true,
      },
      isFetched: true,
    });
    (useKnowledgeBaseIndices as jest.Mock).mockReturnValue({
      data: { indices: ['index-1', 'index-2'] },
    });
    (useKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      data: { data: mockData },
      isFetching: false,
      refetch: jest.fn(),
    });
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: false,
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });
    (useCreateKnowledgeBaseEntry as jest.Mock).mockReturnValue({
      mutateAsync: mockCreateEntry,
      isLoading: false,
    });
    (useUpdateKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      mutateAsync: mockUpdateEntry,
      isLoading: false,
    });
    (useDeleteKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteEntry,
      isLoading: false,
    });
  });
  it('renders loading spinner when data is not fetched', () => {
    (useKnowledgeBaseStatus as jest.Mock).mockReturnValue({ data: {}, isFetched: false });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('spinning')).toBeInTheDocument();
  });

  it('Prompts user to set up knowledge base when isKbSetup', async () => {
    (useKnowledgeBaseStatus as jest.Mock).mockReturnValue({
      data: {
        elser_exists: false,
        security_labs_exists: false,
        index_exists: false,
        pipeline_exists: false,
      },
      isFetched: true,
    });
    (isKnowledgeBaseSetup as jest.Mock).mockReturnValue(false);
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('setup-knowledge-base-button')).toBeInTheDocument();
  });

  it('renders knowledge base table with entries', async () => {
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });
    waitFor(() => {
      expect(screen.getByTestId('knowledge-base-entries-table')).toBeInTheDocument();
      expect(screen.getByText('Test Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Test Entry 2')).toBeInTheDocument();
    });
  });

  it('renders entries in correct order', async () => {
    (useKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            createdAt: '2024-10-21T18:54:14.773Z',
            createdBy: 'u_user_id_1',
            updatedAt: '2024-10-23T17:33:15.933Z',
            updatedBy: 'u_user_id_1',
            users: [{ name: 'Test User 1' }],
            name: 'A',
            namespace: 'default',
            type: 'document',
            kbResource: 'user',
            source: 'user',
            text: 'Very nice text',
          },
          {
            id: '2',
            createdAt: '2024-10-25T09:55:56.596Z',
            createdBy: 'u_user_id_2',
            updatedAt: '2024-10-25T09:55:56.596Z',
            updatedBy: 'u_user_id_2',
            users: [],
            name: 'b',
            namespace: 'default',
            type: 'index',
            index: 'index-1',
            field: 'semantic_field1',
            description: 'Test description',
            queryDescription: 'Test query instruction',
          },
          {
            id: '3',
            createdAt: '2024-10-25T09:55:56.596Z',
            createdBy: 'u_user_id_2',
            updatedAt: '2024-10-25T09:55:56.596Z',
            updatedBy: 'u_user_id_2',
            users: [],
            name: 'B',
            namespace: 'default',
            type: 'index',
            index: 'index-1',
            field: 'semantic_field1',
            description: 'Test description',
            queryDescription: 'Test query instruction',
          },
          {
            id: '4',
            createdAt: '2024-10-25T09:55:56.596Z',
            createdBy: 'u_user_id_1',
            updatedAt: '2024-10-25T09:55:56.596Z',
            updatedBy: 'u_user_id_1',
            users: [{ name: 'Test User 1' }],
            name: 'a',
            namespace: 'default',
            type: 'index',
            index: 'index-2',
            field: 'semantic_field2',
            description: 'Test description',
            queryDescription: 'Test query instruction',
          },
        ],
      },
      isFetching: false,
      refetch: jest.fn(),
    });

    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(screen.getByTestId('knowledge-base-entries-table')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('a')).toBeInTheDocument();
      expect(screen.getByText('b')).toBeInTheDocument();
    });

    // Order ascending
    await userEvent.click(screen.getByText('Name'));

    await waitFor(() => {
      // Upper case letters should come before lower case letters
      expect(screen.getByText('A').compareDocumentPosition(screen.getByText('a'))).toBe(4);
      expect(screen.getByText('B').compareDocumentPosition(screen.getByText('b'))).toBe(4);

      expect(screen.getByText('A').compareDocumentPosition(screen.getByText('B'))).toBe(4);
      expect(screen.getByText('a').compareDocumentPosition(screen.getByText('B'))).toBe(4);
      expect(screen.getByText('a').compareDocumentPosition(screen.getByText('b'))).toBe(4);
    });

    // Order decending
    await userEvent.click(screen.getByText('Name'));

    await waitFor(() => {
      // Lower case letters should come before upper case letters
      expect(screen.getByText('A').compareDocumentPosition(screen.getByText('a'))).toBe(2);
      expect(screen.getByText('B').compareDocumentPosition(screen.getByText('b'))).toBe(2);

      expect(screen.getByText('A').compareDocumentPosition(screen.getByText('B'))).toBe(2);
      expect(screen.getByText('a').compareDocumentPosition(screen.getByText('B'))).toBe(2);
      expect(screen.getByText('a').compareDocumentPosition(screen.getByText('b'))).toBe(2);
    });
  });

  it('opens the flyout when add document button is clicked', async () => {
    const openFlyoutMock = jest.fn();
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: false,
      openFlyout: openFlyoutMock,
      closeFlyout: jest.fn(),
    });

    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addEntry'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addDocument'));
    });
    expect(openFlyoutMock).toHaveBeenCalled();
  });

  it('uses entry_search_term as default query', async () => {
    const rawHistory = createMemoryHistory({
      initialEntries: ['/example?entry_search_term=testQuery'],
    });
    const { container } = render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: (props) => <Wrapper history={rawHistory}>{props.children}</Wrapper>,
    });
    waitFor(() => {
      expect(screen.getByTestId('knowledge-base-entries-table')).toBeInTheDocument();
      expect(
        container
          .querySelector('input[type=search][placeholder="Search for an entry"]')
          ?.getAttribute('value')
      ).toEqual('testQuery');
    });
  });

  it('refreshes table on refresh button click', async () => {
    const refetchMock = jest.fn();
    (useKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      data: { data: mockData },
      isFetching: false,
      refetch: refetchMock,
    });

    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('refresh-entries'));
    });
    expect(refetchMock).toHaveBeenCalled();
  });

  it('handles save and cancel actions for the flyout', async () => {
    const closeFlyoutMock = jest.fn();
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
      openFlyout: jest.fn(),
      closeFlyout: closeFlyoutMock,
    });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addEntry'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addDocument'));
    });

    expect(screen.getByTestId('flyout')).toBeVisible();

    await userEvent.type(screen.getByTestId('entryNameInput'), 'hi');

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('cancel-button'));
    });

    expect(closeFlyoutMock).toHaveBeenCalled();
  });

  it('handles delete confirmation modal actions', async () => {
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getAllByTestId('delete-button')[0]);
    });
    expect(screen.getByTestId('delete-entry-confirmation')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });
    expect(screen.queryByTestId('delete-entry-confirmation')).not.toBeInTheDocument();
  });

  it('does not create a duplicate document entry when switching sharing option twice', async () => {
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getAllByTestId('edit-button')[0]);
    });
    expect(screen.getByTestId('flyout')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('Edit document entry')).toBeInTheDocument();
    });

    const updatedName = 'New Entry Name';
    await waitFor(() => {
      const nameInput = screen.getByTestId('entryNameInput');
      fireEvent.change(nameInput, { target: { value: updatedName } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-global-option'));
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-private-option'));
      fireEvent.click(screen.getByTestId('save-button'));
    });

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateEntry).toHaveBeenCalledTimes(0);
    expect(mockUpdateEntry).toHaveBeenCalledWith([{ ...mockData[0], name: updatedName }]);
  });

  it('does not create a duplicate index entry when switching sharing option twice', async () => {
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getAllByTestId('edit-button')[2]);
    });
    expect(screen.getByTestId('flyout')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('Edit index entry')).toBeInTheDocument();
    });

    const updatedName = 'New Entry Name';
    await waitFor(() => {
      const nameInput = screen.getByTestId('entry-name');
      fireEvent.change(nameInput, { target: { value: updatedName } });
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-global-option'));
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-private-option'));
      fireEvent.click(screen.getByTestId('save-button'));
    });

    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateEntry).toHaveBeenCalledTimes(0);
    expect(mockUpdateEntry).toHaveBeenCalledWith([{ ...mockData[2], name: updatedName }]);
  });

  it('shows duplicate entry modal when making global to private entry update', async () => {
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
      openFlyout: jest.fn(),
      closeFlyout: jest.fn(),
    });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getAllByTestId('edit-button')[3]);
    });
    expect(screen.getByTestId('flyout')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('Edit document entry')).toBeInTheDocument();
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-private-option'));
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(screen.getByTestId('create-duplicate-entry-modal')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });
    expect(screen.queryByTestId('create-duplicate-entry-modal')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateEntry).toHaveBeenCalledTimes(0);
    expect(mockCreateEntry).toHaveBeenCalledWith({ ...mockData[3], users: undefined });
  });

  it('does not show duplicate entry modal on new document entry creation', async () => {
    // Covers the BUG: https://github.com/elastic/kibana/issues/198892
    const closeFlyoutMock = jest.fn();
    (useFlyoutModalVisibility as jest.Mock).mockReturnValue({
      isFlyoutOpen: true,
      openFlyout: jest.fn(),
      closeFlyout: closeFlyoutMock,
    });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getAllByTestId('edit-button')[3]);
    });
    expect(screen.getByTestId('flyout')).toBeVisible();

    await waitFor(() => {
      expect(screen.getByText('Edit document entry')).toBeInTheDocument();
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('sharing-select'));
      fireEvent.click(screen.getByTestId('sharing-private-option'));
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(screen.getByTestId('create-duplicate-entry-modal')).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    });
    expect(screen.queryByTestId('create-duplicate-entry-modal')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    });

    // Create a new document entry
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addEntry'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addDocument'));
    });

    expect(screen.getByTestId('flyout')).toBeVisible();

    await userEvent.type(screen.getByTestId('entryNameInput'), 'hi');
    await userEvent.type(screen.getByTestId('entryMarkdownInput'), 'hi');

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(screen.queryByTestId('create-duplicate-entry-modal')).not.toBeInTheDocument();
    expect(closeFlyoutMock).toHaveBeenCalled();
  });

  it('shows warning icon for index entries with missing indices', async () => {
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(screen.getByTestId('missing-index-icon')).toBeInTheDocument());

    expect(screen.getAllByTestId('missing-index-icon').length).toEqual(1);

    fireEvent.mouseOver(screen.getByTestId('missing-index-icon'));

    await waitFor(() => screen.getByTestId('missing-index-tooltip'));

    expect(
      screen.getByText(
        'The index assigned to this knowledge base entry is unavailable. Check the permissions on the configured index, or that the index has not been deleted. You can update the index to be used for this knowledge entry, or delete the entry entirely.'
      )
    ).toBeInTheDocument();
  });
});
