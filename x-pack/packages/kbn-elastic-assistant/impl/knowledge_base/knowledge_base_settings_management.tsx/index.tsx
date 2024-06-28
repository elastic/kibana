/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiPopover,
  EuiSearchBarProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { AlertsSettingsManagement } from '../../alerts/settings/alerts_settings_management';
import { useKnowledgeBaseEntries } from '../../assistant/api/knowledge_base/entries/use_knowledge_base_entries';
import { useDeleteKnowledgeBase } from '../../assistant/api/knowledge_base/use_delete_knowledge_base';
import { useKnowledgeBaseStatus } from '../../assistant/api/knowledge_base/use_knowledge_base_status';
import { useSetupKnowledgeBase } from '../../assistant/api/knowledge_base/use_setup_knowledge_base';
import { KnowledgeBaseConfig } from '../../assistant/types';
import { useAssistantContext } from '../../assistant_context';
import { ESQL_RESOURCE } from '../const';
import { KnowledgeBaseSwitch } from '../knowledge_base_switch';
import * as i18n from '../translations';
import { useKnowledgeBaseResultStatus } from '../use_knowledge_base_result_status';
import { useKnowledgeBaseTable } from './use_knowledge_base_table';
import {
  CREATE_INDEX_TITLE,
  DELETE_ENTRY_CONFIRMATION_TITLE,
  DELETE_ENTRY_DEFAULT_TITLE,
  ENTRY,
  INDEX,
  MANUAL,
  NEW_ENTRY_TITLE,
} from './translations';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE } from '../../assistant/settings/const';
import { useFlyoutModalVisibility } from '../../assistant/common/components/assistant_settings_management/flyout/use_flyout_modal_visibility';
import { Flyout } from '../../assistant/common/components/assistant_settings_management/flyout';
import { EntryEditor } from './entry_editor';
import { IndexEntryEditor } from './index_entry_editor';
import { CANCEL, DELETE } from '../../assistant/settings/translations';

interface Props {
  knowledgeBase: KnowledgeBaseConfig;
  setUpdatedKnowledgeBaseSettings: React.Dispatch<React.SetStateAction<KnowledgeBaseConfig>>;
  resetSettings: () => void;
}

interface FlyoutType {
  type: 'index' | 'manual';
  isCreation: boolean;
}

export const KnowledgeBaseSettingsManagement: React.FC<Props> = React.memo(
  ({ knowledgeBase, setUpdatedKnowledgeBaseSettings, resetSettings }) => {
    const {
      assistantFeatures: { assistantKnowledgeBaseByDefault: enableKnowledgeBaseByDefault },
      http,
      toasts,
    } = useAssistantContext();
    const {
      data: kbStatus,
      isLoading,
      isFetching,
    } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
    const { mutate: setupKB, isLoading: isSettingUpKB } = useSetupKnowledgeBase({ http });
    const { isLoading: isDeletingUpKB } = useDeleteKnowledgeBase({ http });
    const { data: entries } = useKnowledgeBaseEntries({ http });
    const { mutate: deleteEntry } = useDeleteKnowledgeBase({
      http,
      toasts,
    });

    const { isLoadingKb, isSwitchDisabled } = useKnowledgeBaseResultStatus({
      enableKnowledgeBaseByDefault,
      kbStatus,
      knowledgeBase,
      isLoading,
      isFetching,
      isSettingUpKB,
      isDeletingUpKB,
    });
    const [selectedItem, setSelectedItem] = useState<KnowledgeBaseEntryResponse>();
    const [flyoutType, setFlyoutType] = useState<FlyoutType>();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const closePopover = () => setIsPopoverOpen(false);
    const [deletedItem, setDeletedItem] = useState<KnowledgeBaseEntryResponse | null>();

    const {
      isFlyoutOpen: deleteConfirmModalVisibility,
      openFlyout: openConfirmModal,
      closeFlyout: closeConfirmModal,
    } = useFlyoutModalVisibility();

    const { isFlyoutOpen, openFlyout, closeFlyout } = useFlyoutModalVisibility();
    const getEntryType = (item: KnowledgeBaseEntryResponse): 'index' | 'manual' => {
      // todo: implement
      return 'manual';
    };
    const { getColumns } = useKnowledgeBaseTable();
    const columns = getColumns({
      onEntryNameClicked: (id: string) => {},
      onSpaceNameClicked: (namespace: string) => {},
      onEditActionClicked: (item: KnowledgeBaseEntryResponse) => {
        setSelectedItem(item);
        setFlyoutType({ type: getEntryType(item), isCreation: false });
        closePopover();
        openFlyout();
      },
      onDeleteActionClicked: (item: KnowledgeBaseEntryResponse) => {
        setDeletedItem(item);
        closePopover();
        openConfirmModal();
      },
    });

    const onManualActionClicked = useCallback(() => {
      setFlyoutType({ type: 'manual', isCreation: true });
      setSelectedItem(undefined);
      closePopover();
      openFlyout();
    }, [openFlyout]);
    const onIndexActionClicked = useCallback(() => {
      setFlyoutType({ type: 'index', isCreation: true });
      setSelectedItem(undefined);
      closePopover();
      openFlyout();
    }, [openFlyout]);
    const onSaveConfirmed = useCallback(() => {
      closeFlyout();
    }, [closeFlyout]);

    const onSaveCancelled = useCallback(() => {
      closeFlyout();
      resetSettings();
    }, [closeFlyout, resetSettings]);

    const onDeleteCancelled = useCallback(() => {
      setDeletedItem(null);
      closeConfirmModal();
    }, [closeConfirmModal]);

    const onDeleteConfirmed = useCallback(() => {
      if (!deletedItem) {
        return;
      }
      deleteEntry(deletedItem.id);

      closeConfirmModal();
      setDeletedItem(null);
    }, [closeConfirmModal, deleteEntry, deletedItem]);

    const flyoutTitle = useMemo(() => {
      if (!flyoutType) {
        return;
      }
      if (flyoutType.type === 'index') {
        if (flyoutType.isCreation) {
          return CREATE_INDEX_TITLE;
        } else {
          return selectedItem?.id;
        }
      } else {
        if (flyoutType.isCreation) {
          return NEW_ENTRY_TITLE;
        } else {
          return selectedItem?.id;
        }
      }
    }, [flyoutType, selectedItem?.id]);

    const renderToolsRight = useCallback(() => {
      return (
        <EuiPopover
          initialFocus="#name"
          button={
            <EuiButton
              iconType="arrowDown"
              iconSide="right"
              fill
              onClick={() => setIsPopoverOpen((prev) => !prev)}
            >
              <EuiIcon type="plusInCircle" />
              {ENTRY}
            </EuiButton>
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
            {onManualActionClicked != null && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  aria-label={MANUAL}
                  iconType="pencil"
                  onClick={onManualActionClicked}
                  color="text"
                >
                  {MANUAL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {onIndexActionClicked != null && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  aria-label={INDEX}
                  iconType="index"
                  onClick={onIndexActionClicked}
                  color="text"
                >
                  {INDEX}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPopover>
      );
    }, [isPopoverOpen, onIndexActionClicked, onManualActionClicked]);

    const search: EuiSearchBarProps = useMemo(
      () => ({
        toolsRight: renderToolsRight(),
        box: {
          incremental: true,
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
      [entries.data, renderToolsRight]
    );

    const pagination = useMemo(
      () => ({
        pageIndex: DEFAULT_PAGE_INDEX,
        pageSize: DEFAULT_PAGE_SIZE,
      }),
      []
    );

    const confirmationTitle = useMemo(
      () =>
        deletedItem?.id
          ? DELETE_ENTRY_CONFIRMATION_TITLE(deletedItem.id)
          : DELETE_ENTRY_DEFAULT_TITLE,
      [deletedItem?.id]
    );

    return (
      <>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <KnowledgeBaseSwitch
            compressed={false}
            enableKnowledgeBaseByDefault={enableKnowledgeBaseByDefault}
            isEnabledKnowledgeBase={knowledgeBase.isEnabledKnowledgeBase}
            isLoadingKb={isLoadingKb}
            isSwitchDisabled={isSwitchDisabled}
            kbStatusElserExists={kbStatus?.elser_exists ?? false}
            knowledgeBase={knowledgeBase}
            setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
            setupKB={setupKB}
            showLabel={true}
          />
          <EuiSpacer size="m" />
          <EuiText size={'m'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
          <EuiSpacer size="l" />
          <EuiInMemoryTable
            columns={columns}
            items={entries.data ?? []}
            search={search}
            pagination={pagination}
          />
        </EuiPanel>
        <EuiSpacer size="m" />
        <AlertsSettingsManagement
          knowledgeBase={knowledgeBase}
          setUpdatedKnowledgeBaseSettings={setUpdatedKnowledgeBaseSettings}
        />
        <Flyout
          flyoutVisible={isFlyoutOpen}
          title={flyoutTitle}
          onClose={closeFlyout}
          onSaveCancelled={onSaveCancelled}
          onSaveConfirmed={onSaveConfirmed}
        >
          <>
            {flyoutType?.type === 'manual' && <EntryEditor entry={selectedItem} />}
            {flyoutType?.type === 'index' && <IndexEntryEditor entry={selectedItem} />}
          </>
        </Flyout>
        {deleteConfirmModalVisibility && deletedItem?.id && (
          <EuiConfirmModal
            aria-labelledby={confirmationTitle}
            title={confirmationTitle}
            titleProps={{ id: deletedItem?.id ?? undefined }}
            onCancel={onDeleteCancelled}
            onConfirm={onDeleteConfirmed}
            cancelButtonText={CANCEL}
            confirmButtonText={DELETE}
            buttonColor="danger"
            defaultFocusedButton="confirm"
          >
            <p />
          </EuiConfirmModal>
        )}
      </>
    );
  }
);

KnowledgeBaseSettingsManagement.displayName = 'KnowledgeBaseSettingsManagement';
