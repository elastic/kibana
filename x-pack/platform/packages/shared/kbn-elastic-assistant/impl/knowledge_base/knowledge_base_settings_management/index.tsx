/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
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
import { css } from '@emotion/react';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { ProductDocumentationManagement } from '../../assistant/settings/product_documentation';
import { KnowledgeBaseTour } from '../../tour/knowledge_base';
import { AlertsSettingsManagement } from '../../assistant/settings/alerts_settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useAssistantContext } from '../../assistant_context';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import { AssistantSettingsBottomBar } from '../../assistant/settings/assistant_settings_bottom_bar';
import {
  useSettingsUpdater,
  DEFAULT_CONVERSATIONS,
  DEFAULT_PROMPTS,
} from '../../assistant/settings/use_settings_updater/use_settings_updater';
import { AddEntryButton } from './add_entry_button';
import * as i18n from './translations';
import { Flyout } from '../../assistant/common/components/assistant_settings_management/flyout';
import { useFlyoutModalVisibility } from '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { IndexEntryEditor } from './index_entry_editor';
import { DocumentEntryEditor } from './document_entry_editor';
import { SetupKnowledgeBaseButton } from '../setup_knowledge_base_button';
import { useDeleteKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_delete_knowledge_base_entries';
import {
  isSystemEntry,
  isKnowledgeBaseEntryCreateProps,
  isKnowledgeBaseEntryResponse,
  isGlobalEntry,
} from './helpers';
import { useCreateKnowledgeBaseEntry } from '../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry';
import { useUpdateKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_update_knowledge_base_entries';
import { DELETE, SETTINGS_UPDATED_TOAST_TITLE } from '../../assistant/settings/translations';
import { KnowledgeBaseConfig } from '../../assistant/types';
import {
  isKnowledgeBaseSetup,
  useKnowledgeBaseStatus,
} from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { CANCEL_BUTTON_TEXT } from '../../assistant/assistant_header/translations';

interface Params {
  dataViews: DataViewsContract;
}

export const KnowledgeBaseSettingsManagement: React.FC<Params> = React.memo(({ dataViews }) => {
  const {
    assistantAvailability: { hasManageGlobalKnowledgeBase, isAssistantEnabled },
    http,
    toasts,
  } = useAssistantContext();
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const { data: kbStatus, isFetched } = useKnowledgeBaseStatus({
    http,
    enabled: isAssistantEnabled,
  });
  const isKbSetup = isKnowledgeBaseSetup(kbStatus);
  const [searchParams] = useSearchParams();
  const initialSearchTerm = useMemo(
    () => (searchParams.get('entry_search_term') as string) ?? undefined,
    [searchParams]
  );

  const [deleteKBItem, setDeleteKBItem] = useState<DocumentEntry | IndexEntry | null>(null);
  const [duplicateKBItem, setDuplicateKBItem] = useState<KnowledgeBaseEntryCreateProps | null>(
    null
  );
  const [originalEntry, setOriginalEntry] = useState<DocumentEntry | IndexEntry | undefined>(
    undefined
  );

  // Only needed for legacy settings management
  const { knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings, saveSettings } =
    useSettingsUpdater(
      DEFAULT_CONVERSATIONS, // Knowledge Base settings do not require conversations
      DEFAULT_PROMPTS, // Knowledge Base settings do not require prompts
      false, // Knowledge Base settings do not require conversations
      false // Knowledge Base settings do not require prompts
    );

  const handleUpdateKnowledgeBaseSettings = useCallback<
    React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>
  >(
    (updatedKnowledgeBase) => {
      setHasPendingChanges(true);
      setUpdatedKnowledgeBaseSettings(updatedKnowledgeBase);
    },
    [setUpdatedKnowledgeBaseSettings]
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

  const [selectedEntry, setSelectedEntry] =
    useState<Partial<DocumentEntry | IndexEntry | KnowledgeBaseEntryCreateProps>>();

  // CRUD API accessors
  const { mutateAsync: createEntry, isLoading: isCreatingEntry } = useCreateKnowledgeBaseEntry({
    http,
    toasts,
  });
  const { mutateAsync: updateEntries, isLoading: isUpdatingEntries } =
    useUpdateKnowledgeBaseEntries({
      http,
      toasts,
    });
  const { mutateAsync: deleteEntry, isLoading: isDeletingEntries } = useDeleteKnowledgeBaseEntries({
    http,
    toasts,
  });
  const isModifyingEntry = isCreatingEntry || isUpdatingEntries || isDeletingEntries;

  const {
    data: entries,
    isFetching: isFetchingEntries,
    refetch: refetchEntries,
  } = useKnowledgeBaseEntries({
    http,
    toasts,
    enabled: isAssistantEnabled,
    isRefetching: kbStatus?.is_setup_in_progress,
  });

  const resetStateAndCloseFlyout = useCallback(() => {
    setOriginalEntry(undefined);
    setSelectedEntry(undefined);
    setDuplicateKBItem(null);
    closeFlyout();
  }, [closeFlyout]);

  // Flyout Save/Cancel Actions
  const onSaveConfirmed = useCallback(async () => {
    if (isKnowledgeBaseEntryResponse(selectedEntry)) {
      await updateEntries([selectedEntry]);
      resetStateAndCloseFlyout();
    } else if (isKnowledgeBaseEntryCreateProps(selectedEntry)) {
      if (originalEntry) {
        setDuplicateKBItem(selectedEntry);
        return;
      }
      await createEntry(selectedEntry);
      resetStateAndCloseFlyout();
    }
  }, [selectedEntry, updateEntries, resetStateAndCloseFlyout, originalEntry, createEntry]);

  const onSaveCancelled = useCallback(() => {
    resetStateAndCloseFlyout();
  }, [resetStateAndCloseFlyout]);

  const { value: existingIndices } = useAsync(() => {
    const indices: string[] = [];
    entries.data.forEach((entry) => {
      if (entry.type === 'index') {
        indices.push(entry.index);
      }
    });

    return indices.length ? dataViews.getExistingIndices(indices) : Promise.resolve([]);
  }, [entries.data]);

  const { getColumns } = useKnowledgeBaseTable();
  const columns = useMemo(
    () =>
      getColumns({
        isKbSetupInProgress: kbStatus?.is_setup_in_progress ?? false,
        existingIndices,
        isDeleteEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return (
            !isSystemEntry(entry) && (isGlobalEntry(entry) ? hasManageGlobalKnowledgeBase : true)
          );
        },
        // Add delete popover
        onDeleteActionClicked: (item: KnowledgeBaseEntryResponse) => {
          setDeleteKBItem(item);
        },
        isEditEnabled: (entry: KnowledgeBaseEntryResponse) => {
          return (
            !isSystemEntry(entry) && (isGlobalEntry(entry) ? hasManageGlobalKnowledgeBase : true)
          );
        },
        onEditActionClicked: ({ id }: KnowledgeBaseEntryResponse) => {
          const entry = entries.data.find((e) => e.id === id);
          setOriginalEntry(entry);
          setSelectedEntry(entry);
          openFlyout();
        },
      }),
    [
      entries.data,
      existingIndices,
      getColumns,
      hasManageGlobalKnowledgeBase,
      kbStatus?.is_setup_in_progress,
      openFlyout,
    ]
  );

  // Refresh button
  const handleRefreshTable = useCallback(() => refetchEntries(), [refetchEntries]);

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
        <EuiFlexGroup
          gutterSize={'m'}
          css={css`
            margin-left: -5px;
          `}
        >
          <EuiFlexItem>
            <EuiButton
              color={'text'}
              data-test-subj={'refresh-entries'}
              isDisabled={isFetchingEntries}
              onClick={handleRefreshTable}
              iconType={'refresh'}
              isLoading={isFetchingEntries}
            >
              <FormattedMessage
                id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingManagements.refreshButton"
                defaultMessage="Refresh"
              />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem>
            <AddEntryButton onDocumentClicked={onDocumentClicked} onIndexClicked={onIndexClicked} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      box: {
        incremental: true,
        placeholder: i18n.SEARCH_PLACEHOLDER,
      },
      filters: [],
      defaultQuery: initialSearchTerm,
    }),
    [isFetchingEntries, handleRefreshTable, onDocumentClicked, onIndexClicked, initialSearchTerm]
  );

  const flyoutTitle = useMemo(() => {
    // @ts-expect-error TS doesn't understand that selectedEntry is a partial
    if (selectedEntry?.id != null) {
      return selectedEntry.type === DocumentEntryType.value
        ? i18n.EDIT_DOCUMENT_FLYOUT_TITLE
        : i18n.EDIT_INDEX_FLYOUT_TITLE;
    }
    return selectedEntry?.type === DocumentEntryType.value
      ? i18n.NEW_DOCUMENT_FLYOUT_TITLE
      : i18n.NEW_INDEX_FLYOUT_TITLE;
  }, [selectedEntry]);

  const sorting = {
    sort: {
      field: 'name',
      direction: 'desc' as const,
    },
  };

  const handleCancelDeleteEntry = useCallback(() => {
    setDeleteKBItem(null);
  }, [setDeleteKBItem]);

  const handleDeleteEntry = useCallback(async () => {
    if (deleteKBItem?.id) {
      await deleteEntry({ ids: [deleteKBItem?.id] });
      setDeleteKBItem(null);
    }
  }, [deleteEntry, deleteKBItem, setDeleteKBItem]);

  const handleCancelDuplicateEntry = useCallback(() => {
    setDuplicateKBItem(null);
  }, [setDuplicateKBItem]);

  const handleDuplicateEntry = useCallback(async () => {
    if (duplicateKBItem) {
      await createEntry(duplicateKBItem);
      resetStateAndCloseFlyout();
    }
  }, [createEntry, duplicateKBItem, resetStateAndCloseFlyout]);

  return (
    <>
      <ProductDocumentationManagement />
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
                  {i18n.KNOWLEDGE_BASE_DOCUMENTATION}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            {!isFetched ? (
              <EuiLoadingSpinner data-test-subj="spinning" size="l" />
            ) : isKbSetup ? (
              <EuiInMemoryTable
                data-test-subj="knowledge-base-entries-table"
                columns={columns}
                items={entries.data ?? []}
                search={search}
                sorting={sorting}
              />
            ) : (
              <>
                <EuiSpacer size="l" />
                <EuiText size={'m'}>
                  <FormattedMessage
                    id="xpack.elasticAssistant.assistant.settings.knowledgeBasedSettingManagements.knowledgeBaseSetupDescription"
                    defaultMessage="Setup to get started with the Knowledge Base."
                  />
                </EuiText>

                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent="spaceAround">
                  <EuiFlexItem grow={false}>
                    <SetupKnowledgeBaseButton />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="l" />
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
      <AlertsSettingsManagement
        knowledgeBase={knowledgeBase}
        setUpdatedKnowledgeBaseSettings={handleUpdateKnowledgeBaseSettings}
      />
      <AssistantSettingsBottomBar
        hasPendingChanges={hasPendingChanges}
        onCancelClick={onCancelClick}
        onSaveButtonClicked={onSaveButtonClicked}
      />
      <Flyout
        flyoutVisible={isFlyoutVisible}
        title={flyoutTitle}
        onClose={onSaveCancelled}
        onSaveCancelled={onSaveCancelled}
        onSaveConfirmed={onSaveConfirmed}
        saveButtonDisabled={
          !isKnowledgeBaseEntryCreateProps(selectedEntry) ||
          (selectedEntry.users != null &&
            !selectedEntry.users.length &&
            !hasManageGlobalKnowledgeBase)
        }
        saveButtonLoading={isModifyingEntry}
      >
        <>
          {selectedEntry?.type === DocumentEntryType.value ? (
            <DocumentEntryEditor
              entry={selectedEntry as DocumentEntry}
              originalEntry={originalEntry as DocumentEntry}
              setEntry={
                setSelectedEntry as React.Dispatch<React.SetStateAction<Partial<DocumentEntry>>>
              }
              hasManageGlobalKnowledgeBase={hasManageGlobalKnowledgeBase}
            />
          ) : (
            <IndexEntryEditor
              http={http}
              entry={selectedEntry as IndexEntry}
              originalEntry={originalEntry as IndexEntry}
              dataViews={dataViews}
              setEntry={
                setSelectedEntry as React.Dispatch<React.SetStateAction<Partial<IndexEntry>>>
              }
              hasManageGlobalKnowledgeBase={hasManageGlobalKnowledgeBase}
            />
          )}
        </>
      </Flyout>
      {deleteKBItem && (
        <EuiConfirmModal
          data-test-subj="delete-entry-confirmation"
          title={i18n.DELETE_ENTRY_CONFIRMATION_TITLE(deleteKBItem.name)}
          onCancel={handleCancelDeleteEntry}
          onConfirm={handleDeleteEntry}
          cancelButtonText={CANCEL_BUTTON_TEXT}
          confirmButtonText={DELETE}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          confirmButtonDisabled={isModifyingEntry}
          isLoading={isModifyingEntry}
        >
          <p>{i18n.DELETE_ENTRY_CONFIRMATION_CONTENT}</p>
        </EuiConfirmModal>
      )}
      {duplicateKBItem && (
        <EuiConfirmModal
          title={i18n.DUPLICATE_ENTRY_CONFIRMATION_TITLE}
          onCancel={handleCancelDuplicateEntry}
          onConfirm={handleDuplicateEntry}
          cancelButtonText={CANCEL_BUTTON_TEXT}
          confirmButtonText={i18n.SAVE_BUTTON_TEXT}
          defaultFocusedButton="confirm"
          data-test-subj="create-duplicate-entry-modal"
        >
          <p>{i18n.DUPLICATE_ENTRY_CONFIRMATION_CONTENT}</p>
        </EuiConfirmModal>
      )}
      <KnowledgeBaseTour isKbSettingsPage />
    </>
  );
});

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
