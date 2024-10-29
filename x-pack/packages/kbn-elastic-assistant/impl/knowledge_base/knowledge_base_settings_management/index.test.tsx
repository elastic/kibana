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

const mockContext = {
  basePromptContexts: MOCK_QUICK_PROMPTS,
  setSelectedSettingsTab: jest.fn(),
  http: {
    get: jest.fn(),
  },
  assistantFeatures: { assistantKnowledgeBaseByDefault: true },
  selectedSettingsTab: null,
  assistantAvailability: {
    isAssistantEnabled: true,
  },
};
jest.mock('../../assistant_context');
jest.mock('../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry');
jest.mock('../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries');
jest.mock('../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries');

jest.mock('../../assistant/settings/use_settings_updater/use_settings_updater');
jest.mock('../../assistant/api/knowledge_base/use_knowledge_base_status');
jest.mock('../../assistant/api/knowledge_base/entries/use_knowledge_base_entries');
jest.mock(
  '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility'
);
const mockDataViews = {
  getIndices: jest.fn().mockResolvedValue([{ name: 'index-1' }, { name: 'index-2' }]),
  getFieldsForWildcard: jest.fn().mockResolvedValue([
    { name: 'field-1', esTypes: ['semantic_text'] },
    { name: 'field-2', esTypes: ['text'] },
    { name: 'field-3', esTypes: ['semantic_text'] },
  ]),
} as unknown as DataViewsContract;
const queryClient = new QueryClient();
const wrapper = (props: { children: React.ReactNode }) => (
  <I18nProvider>
    <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
  </I18nProvider>
);
describe('KnowledgeBaseSettingsManagement', () => {
  const mockData = [
    { id: '1', name: 'Test Entry 1', type: 'document', kbResource: 'user', users: [{ id: 'hi' }] },
    { id: '2', name: 'Test Entry 2', type: 'index', kbResource: 'global', users: [] },
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
      mutateAsync: jest.fn(),
      isLoading: false,
    });
    (useUpdateKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    });
    (useDeleteKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false,
    });
  });
  it('renders old kb settings when enableKnowledgeBaseByDefault is not enabled', () => {
    (useAssistantContext as jest.Mock).mockImplementation(() => ({
      ...mockContext,
      assistantFeatures: {
        assistantKnowledgeBaseByDefault: false,
      },
    }));
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, { wrapper });

    expect(screen.getByTestId('knowledge-base-settings')).toBeInTheDocument();
  });
  it('renders loading spinner when data is not fetched', () => {
    (useKnowledgeBaseStatus as jest.Mock).mockReturnValue({ data: {}, isFetched: false });
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper,
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
      wrapper,
    });

    expect(screen.getByTestId('setup-knowledge-base-button')).toBeInTheDocument();
  });

  it('renders knowledge base table with entries', async () => {
    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper,
    });
    waitFor(() => {
      expect(screen.getByTestId('knowledge-base-entries-table')).toBeInTheDocument();
      expect(screen.getByText('Test Entry 1')).toBeInTheDocument();
      expect(screen.getByText('Test Entry 2')).toBeInTheDocument();
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
      wrapper,
    });

    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addEntry'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('addDocument'));
    });
    expect(openFlyoutMock).toHaveBeenCalled();
  });

  it('refreshes table on refresh button click', async () => {
    const refetchMock = jest.fn();
    (useKnowledgeBaseEntries as jest.Mock).mockReturnValue({
      data: { data: mockData },
      isFetching: false,
      refetch: refetchMock,
    });

    render(<KnowledgeBaseSettingsManagement dataViews={mockDataViews} />, {
      wrapper,
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
      wrapper,
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
      wrapper,
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
});
