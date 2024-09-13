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
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DocumentEntry,
  DocumentEntryType,
  IndexEntry,
  IndexEntryType,
  KnowledgeBaseEntryCreateProps,
  KnowledgeBaseEntryResponse,
} from '@kbn/elastic-assistant-common';
import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import {
  isKnowledgeBaseSetup,
  useKnowledgeBaseStatus,
} from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useAssistantContext } from '../../assistant_context';
import { ESQL_RESOURCE } from '../const';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../../assistant/settings/use_settings_updater/use_settings_updater';
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
import {
  isEsqlSystemEntry,
  isKnowledgeBaseEntryCreateProps,
  isKnowledgeBaseEntryResponse,
} from './helpers';
import { useCreateKnowledgeBaseEntry } from '../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry';
import { useUpdateKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries';

export const KnowledgeBaseSettingsManagement: React.FC = React.memo(() => {
  const {
    assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
    http,
    toasts,
  } = useAssistantContext();

  // Only needed for legacy settings management
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings } = useSettingsUpdater(
    DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
    DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
    false, // Knowledge Base settings do not require conversations
    false // Knowledge Base settings do not require prompts
  );

  const { isFlyoutOpen: isFlyoutVisible, openFlyout, closeFlyout } = useFlyoutModalVisibility();

  const [selectedEntry, setSelectedEntry] =
    useState<Partial<DocumentEntry | IndexEntry | KnowledgeBaseEntryCreateProps>>();

  // Knowledge Base Setup/Status
  const {
    data: kbStatus,
    isLoading: isKbLoadingInitial,
    isFetching: isKbFetching,
  } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const isKbSetup = isKnowledgeBaseSetup(kbStatus);
  const isKbLoading = isKbLoadingInitial || isKbFetching;

  // CRUD API accessors
  const { mutate: createEntry, isLoading: isCreatingEntry } = useCreateKnowledgeBaseEntry({
    http,
    toasts,
  });
  const { mutate: updateEntries, isLoading: isUpdatingEntries } = useUpdateKnowledgeBaseEntries({
    http,
    toasts,
  });
  const { mutate: deleteEntry, isLoading: isDeletingEntries } = useDeleteKnowledgeBaseEntries({
    http,
    toasts,
  });
  const isModifyingEntry = isCreatingEntry || isUpdatingEntries || isDeletingEntries;

  // Flyout Save/Cancel Actions
  const onSaveConfirmed = useCallback(() => {
    if (isKnowledgeBaseEntryCreateProps(selectedEntry)) {
      createEntry(selectedEntry);
      closeFlyout();
    } else if (isKnowledgeBaseEntryResponse(selectedEntry)) {
      updateEntries([selectedEntry]);
      closeFlyout();
    }
  }, [closeFlyout, selectedEntry, createEntry, updateEntries]);

  const onSaveCancelled = useCallback(() => {
    setSelectedEntry(undefined);
    closeFlyout();
  }, [closeFlyout]);

  const { data: entries } = useKnowledgeBaseEntries({ http, toasts });
  const { getColumns } = useKnowledgeBaseTable();
  const columns = useMemo(
    () =>
      getColumns({
        onEntryNameClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          const entry = entries.data.find((e) => e.id === id);
          setSelectedEntry(entry);
          openFlyout();
        },
        onSpaceNameClicked: ({ namespace }: KnowledgeBaseEntryResponse) => {
          openFlyout();
        },
        isDeleteEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return !isEsqlSystemEntry(entry);
        },
        onDeleteActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          deleteEntry({ ids: [id] });
        },
        isEditEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return !isEsqlSystemEntry(entry);
        },
        onEditActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {},
      }),
    [deleteEntry, entries.data, getColumns, openFlyout]
  );

  const onDocumentClicked = useCallback(() => {
    setSelectedEntry({ type: DocumentEntryType.value, kbResource: 'user', source: 'user' });
    openFlyout();
  }, [openFlyout]);

  const onIndexClicked = useCallback(() => {
    setSelectedEntry({ type: IndexEntryType.value });
    openFlyout();
  }, [openFlyout]);

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
          // onChange={onTableChange}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
      <AlertsSettingsManagement
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
      />
      <Flyout
        flyoutVisible={isFlyoutVisible}
        title={selectedEntry?.type || DEFAULT_FLYOUT_TITLE} // TODO Update title `New Index Entry` or `New Document Entry`
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={!isKnowledgeBaseEntryCreateProps(selectedEntry)} // TODO: KB-RBAC disable for global entries if user doesn't have global RBAC
      >
        <>
          {selectedEntry?.type === DocumentEntryType.value ? (
            <DocumentEntryEditor
              entry={selectedEntry as DocumentEntry}
              setEntry={setSelectedEntry}
            />
          ) : (
            <IndexEntryEditor entry={selectedEntry as IndexEntry} />
          )}
        </>
      </Flyout>
    </>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
