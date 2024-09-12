/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSearchBarProps,
  EuiSpacer,
  EuiTableSelectionType,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DocumentEntry,
  DocumentEntryType,
  IndexEntry,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useKnowledgeBaseStatus } from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../../assistant/api/knowledge_base/use_setup_knowledge_base';
import { useAssistantContext } from '../../assistant_context';
import { ESQL_RESOURCE } from '../const';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import { AssistantSettingsBottomBar } from '../../assistant/settings/assistant_settings_bottom_bar';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../../assistant/settings/use_settings_updater/use_settings_updater';
import { SETTINGS_UPDATED_TOAST_TITLE } from '../../assistant/settings/translations';
import { AddEntryButton } from './add_entry_button';
import {
  DEFAULT_FLYOUT_TITLE,
  SEARCH_PLACEHOLDER,
  KNOWLEDGE_BASE_DOCUMENTATION,
} from './translations';
import { Flyout } from '../../assistant/common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { IndexEntryEditor } from './index_entry_editor';
import { DocumentEntryEditor } from './document_entry_editor';
import { KnowledgeBaseSettings } from '../knowledge_base_settings';
import { SetupKnowledgeBaseButton } from '../setup_knowledge_base_button';
import { useDeleteKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries';

export const KnowledgeBaseSettingsManagement: React.FC = React.memo(() => {
  const {
    assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    http,
    toasts,
  } = useAssistantContext();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings, saveSettings } =
    useSettingsUpdater(
      DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
      DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
      false, // Knowledge Base settings do not require conversations
      false // Knowledge Base settings do not require prompts
    );

  const handleSave = useCallback(
    async (param?: { callback?: () => void }) => {
      await saveSettings();
      toasts?.addSuccess({
        iconType: 'check',
        title: SETTINGS_UPDATED_TOAST_TITLE,
      });
      setHasPendingChanges(false);
      param?.callback?.();
    },
    [saveSettings, toasts]
  );

  const onCancelClick = useCallback(() => {
    resetSettings();
    setHasPendingChanges(false);
  }, [resetSettings]);

  const onSaveButtonClicked = useCallback(() => {
    handleSave();
  }, [handleSave]);

  const { isFlyoutOpen: isFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();

  const onSaveConfirmed = useCallback(() => {
    handleSave({ callback: closeFlyout });
  }, [handleSave, closeFlyout]);

  const onSaveCancelled = useCallback(() => {
    onCancelClick();
    closeFlyout();
  }, [closeFlyout, onCancelClick]);

  const {
    data: kbStatus,
    isLoading,
    isFetching,
  } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const { mutate: deleteEntry, isLoading: isDeletingEntries } = useDeleteKnowledgeBaseEntries({
    http,
    toasts,
  });
  const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
  const { data: entries } = useKnowledgeBaseEntries({ http, toasts });
  const { getColumns } = useKnowledgeBaseTable();
  const columns = useMemo(
    () =>
      getColumns({
        onEntryNameClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          const entry = entries.data.find((e) => e.id === id);
          setSelectedEntry(entry);
          setSelectedType(entry?.type === 'index' ? 'Index' : 'Document');
          openFlyout();
        },
        onSpaceNameClicked: ({ namespace }: KnowledgeBaseEntryResponse) => {
          openFlyout();
        },
        onDeleteActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          deleteEntry({ ids: [id] });
        },
        onEditActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {},
      }),
    [deleteEntry, entries.data, getColumns, openFlyout]
  );

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const onDocumentClicked = useCallback(() => {
    setSelectedType('Document');
    openFlyout();
  }, [openFlyout]);

  const onIndexClicked = useCallback(() => {
    setSelectedType('Index');
    openFlyout();
  }, [openFlyout]);

  const [selectedEntry, setSelectedEntry] = useState<DocumentEntry | IndexEntry>();

  // Table Selection
  const [selectedItems, setSelectedItems] = useState<KnowledgeBaseEntryResponse[]>([]);
  const onSelectionChange = (items: KnowledgeBaseEntryResponse[]) => {
    setSelectedItems(items);
  };
  const tableSelection: EuiTableSelectionType<KnowledgeBaseEntryResponse> = {
    selectable: (entry: KnowledgeBaseEntryResponse) =>
      !(entry.type === DocumentEntryType.value && entry.kbResource === 'esql'),
    selectableMessage: (selectable: boolean, entry: KnowledgeBaseEntryResponse) =>
      !selectable ? `System entries cannot be selected` : `Select ${entry.name}`,
    onSelectionChange,
    selected: selectedItems,
  };

  const search: EuiSearchBarProps = useMemo(
    () => ({
      toolsRight: (
        <AddEntryButton onDocumentClicked={onDocumentClicked} onIndexClicked={onIndexClicked} />
      ),
      box: {
        incremental: true,
        placeholder: SEARCH_PLACEHOLDER,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'namespace',
          name: 'Spaces',
          multiSelect: false,
          options: entries.data.map(({ namespace }) => ({
            value: namespace,
          })),
        },
      ],
    }),
    [entries.data, onDocumentClicked, onIndexClicked]
  );

  if (!enableKnowledgeBaseByDefault) {
    return (
      <KnowledgeBaseSettings
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
    );
  }

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiText size={'m'}>
          <FormattedMessage
            id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingManagements.knowledgeBaseDescription"
            defaultMessage="The AI Assistant uses Elastic's ELSER model to semantically search your data sources and feed that context to an LLM. Import knowledge bases like Runbooks, GitHub issues, and others for more accurate, personalized assistance. {learnMore}."
            values={{
              learnMore: (
                <EuiLink
                  external
                  href="https://www.elastic.co/guide/en/security/current/security-assistant.html"
                  target="_blank"
                >
                  {KNOWLEDGE_BASE_DOCUMENTATION}
                </EuiLink>
              ),
            }}
          />
          <SetupKnowledgeBaseButton display={'mini'} />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiInMemoryTable
          columns={columns}
          items={entries.data ?? []}
          search={search}
          selection={tableSelection}
          // onChange={onTableChange}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <AlertsSettingsManagement
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
      <Flyout
        flyoutVisible={isFlyoutVisible}
        title={selectedType || DEFAULT_FLYOUT_TITLE}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={false} // TODO: Only disable save on aggregate system entries or if user doesn't have global RBAC
      >
        <>
          {selectedType === 'Document' && (
            <DocumentEntryEditor entry={selectedEntry as DocumentEntry} />
          )}
          {selectedType === 'Index' && <IndexEntryEditor entry={selectedEntry as IndexEntry} />}
        </>
      </Flyout>
    </>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
