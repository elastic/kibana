/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiModal, EuiModalBody, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChangeHistoryEmptyPrompt } from '../timeline/change_history_empty_prompt';
import { ChangeHistoryListErrorPrompt } from '../timeline/change_history_list_error_prompt';
import { ChangeHistoryTimeline } from '../timeline/change_history_timeline';
import { useChangeHistoryAutoSelection } from '../../hooks/use_change_history_auto_selection';
import { useChangeHistoryList } from '../../hooks/use_change_history_list';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { useChangeHistoryModal } from '../../provider/use_change_history_modal';
import { ChangeHistoryModalSelectionContext } from '../../provider/change_history_modal_selection_context';
import type { ChangeHistoryCompareRowOverride } from '../../types/change_history_compare_override';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import type { ChangeHistorySelectionSource } from '../../telemetry/types';
import { findCommittedChangeHistoryListItem } from '../../utils/find_committed_change_history_list_item';
import { findCurrentChangeHistoryListItem } from '../../utils/build_change_history_restore_telemetry';
import { getRestoreVersionLabel } from '../../utils/get_restore_version_label';
import * as i18n from '../timeline/translations';
import { ChangeHistoryPreviewPanel } from './change_history_preview_panel';
import { ChangeHistoryPreviewShell } from './change_history_preview_shell';
import { ChangeHistorySidebarPanel } from './change_history_sidebar_panel';
import { ChangeHistoryDefaultPreviewHeaderActions } from './change_history_default_preview_header_actions';
import { ChangeHistoryRestoreConfirmModal } from './change_history_restore_confirm_modal';

const getHistoryStartedAt = (timestamps: string[]): Date | undefined => {
  if (timestamps.length === 0) {
    return undefined;
  }

  const oldestTimestamp = timestamps[timestamps.length - 1];
  return oldestTimestamp ? new Date(oldestTimestamp) : undefined;
};

export function ChangeHistoryModal(): JSX.Element | null {
  const { euiTheme } = useEuiTheme();
  const { adapter, objectId, labels, supports, telemetry } = useChangeHistoryConfig();
  const { isOpen, closeModal } = useChangeHistoryModal();

  const [selectedChangeId, setSelectedChangeId] = useState<string | undefined>();
  const [compareOverride, setCompareOverride] = useState<
    ChangeHistoryCompareRowOverride | undefined
  >();
  const [restoreConfirmChangeId, setRestoreConfirmChangeId] = useState<string | undefined>();
  const lastReportedChangeIdBySourceRef = useRef<
    Partial<Record<ChangeHistorySelectionSource, string>>
  >({});
  const {
    items,
    total,
    pendingChange,
    isLoading,
    isFetchingFirstPage,
    isLoadingMore,
    error,
    loadMore,
  } = useChangeHistoryList({
    adapter,
    objectId,
    enabled: isOpen,
  });

  const reportChangeSelected = useCallback(
    (item: ChangeHistoryListItem, selectionSource: ChangeHistorySelectionSource) => {
      if (lastReportedChangeIdBySourceRef.current[selectionSource] === item.id) {
        return;
      }

      lastReportedChangeIdBySourceRef.current[selectionSource] = item.id;
      telemetry.reportChangeSelected({
        hasSequence: getRestoreVersionLabel(item) !== undefined,
        selectionSource,
        ...(item.action ? { eventAction: item.action } : {}),
      });
    },
    [telemetry]
  );

  const { lockSelectionDecision, unlockSelectionDecision } = useChangeHistoryAutoSelection({
    objectId,
    items,
    isFetchingFirstPage,
    enabled: isOpen,
    setSelectedChangeId,
    onAutoSelect: (item) => reportChangeSelected(item, 'auto_latest'),
  });

  useEffect(() => {
    if (!isOpen) {
      setSelectedChangeId(undefined);
      setCompareOverride(undefined);
      setRestoreConfirmChangeId(undefined);
      lastReportedChangeIdBySourceRef.current = {};
      unlockSelectionDecision();
    }
  }, [isOpen, unlockSelectionDecision]);

  const handleSelectItem = useCallback(
    (item: ChangeHistoryListItem) => {
      lockSelectionDecision();
      setCompareOverride(undefined);
      setSelectedChangeId(item.id);
      reportChangeSelected(item, 'user_click');
    },
    [lockSelectionDecision, reportChangeSelected]
  );

  const requestCompareToVersion = useCallback(
    (rowChangeId: string) => {
      if (!supports.compare) {
        return;
      }

      if (!selectedChangeId || rowChangeId === selectedChangeId) {
        return;
      }

      const rowItem = items.find((listItem) => listItem.id === rowChangeId);
      if (!rowItem || rowItem.isCurrent) {
        return;
      }

      lockSelectionDecision();
      setCompareOverride({ type: 'vs_row', rowChangeId });
    },
    [items, lockSelectionDecision, selectedChangeId, supports.compare]
  );

  const requestRestoreVersion = useCallback(
    (changeId: string) => {
      if (!supports.restore) {
        return;
      }

      const item = items.find((listItem) => listItem.id === changeId);
      if (!item || item.isCurrent) {
        return;
      }

      setRestoreConfirmChangeId(changeId);
    },
    [items, supports.restore]
  );

  const modalSelectionValue = useMemo(
    () => ({
      ...(supports.compare ? { requestCompareToVersion } : {}),
      ...(supports.restore ? { requestRestoreVersion } : {}),
    }),
    [requestCompareToVersion, requestRestoreVersion, supports.compare, supports.restore]
  );

  const currentChange = useMemo(
    () => findCommittedChangeHistoryListItem(items) ?? findCurrentChangeHistoryListItem(items),
    [items]
  );
  const restoreConfirmChange = useMemo(
    () =>
      restoreConfirmChangeId
        ? items.find((listItem) => listItem.id === restoreConfirmChangeId)
        : undefined,
    [items, restoreConfirmChangeId]
  );

  const styles = useMemo(
    () => ({
      modal: css`
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        block-size: 100vh;
        max-block-size: 100vh !important;
        inline-size: 100vw !important;
        max-inline-size: none !important;
        min-inline-size: 0 !important;
        border-radius: 0;

        .euiModal__closeIcon {
          display: none;
        }
      `,
      modalBody: css`
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;

        &:last-of-type .euiModalBody__overflow {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: ${euiTheme.size.s};
          padding-block-end: ${euiTheme.size.s};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        }
      `,
      splitLayout: css`
        flex: 1;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: stretch;
        gap: ${euiTheme.size.s};
        overflow: hidden;
      `,
      sidebarEmptyState: css`
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.m};
      `,
      fullPageEmptyState: css`
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${euiTheme.size.m};
      `,
    }),
    [euiTheme]
  );

  if (!isOpen) {
    return null;
  }

  const hasItems = items.length > 0;
  const hasNoHistory = !isLoading && !error && !hasItems;
  const showLoadingSidebar = isLoading && !hasItems && !error;
  const showListError = Boolean(error) && !hasItems && !isLoading;
  const committedItemCount = pendingChange ? items.length - 1 : items.length;
  const allItemsLoaded = hasItems && committedItemCount >= total;
  const historyStartedAt = allItemsLoaded
    ? getHistoryStartedAt(items.map((item) => item.timestamp))
    : undefined;

  const previewHeaderActions = supports.restore ? (
    <ChangeHistoryDefaultPreviewHeaderActions
      selectedChangeId={selectedChangeId}
      currentChange={currentChange}
      onRestored={unlockSelectionDecision}
    />
  ) : undefined;

  const renderSidebarContent = () => {
    if (showLoadingSidebar) {
      return <ChangeHistoryTimeline items={[]} isLoading />;
    }

    if (showListError) {
      return (
        <div css={styles.sidebarEmptyState} data-test-subj="changeHistoryModalError">
          <ChangeHistoryListErrorPrompt error={error} />
        </div>
      );
    }

    return (
      <ChangeHistoryTimeline
        items={items}
        selectedItemId={selectedChangeId}
        historyStartedAt={historyStartedAt}
        isLoading={isLoadingMore}
        onSelectItem={handleSelectItem}
        onLoadMore={loadMore}
      />
    );
  };

  if (hasNoHistory) {
    return (
      <EuiModal
        onClose={closeModal}
        maxWidth={false}
        css={styles.modal}
        data-test-subj="changeHistoryModal"
      >
        <EuiModalBody css={styles.modalBody}>
          <ChangeHistoryPreviewShell
            backLabel={labels.previewBackLabel}
            title={labels.previewTitle}
            onBack={closeModal}
          >
            <div css={styles.fullPageEmptyState} data-test-subj="changeHistoryModalEmpty">
              <ChangeHistoryEmptyPrompt />
            </div>
          </ChangeHistoryPreviewShell>
        </EuiModalBody>
      </EuiModal>
    );
  }

  return (
    <ChangeHistoryModalSelectionContext.Provider value={modalSelectionValue}>
      <EuiModal
        onClose={closeModal}
        maxWidth={false}
        css={styles.modal}
        data-test-subj="changeHistoryModal"
      >
        <EuiModalBody css={styles.modalBody}>
          <div css={styles.splitLayout}>
            <ChangeHistoryPreviewShell
              backLabel={labels.previewBackLabel}
              title={labels.previewTitle}
              onBack={closeModal}
              headerActions={previewHeaderActions}
            >
              <ChangeHistoryPreviewPanel
                selectedChangeId={selectedChangeId}
                listItems={items}
                compareOverride={compareOverride}
              />
            </ChangeHistoryPreviewShell>

            <ChangeHistorySidebarPanel title={i18n.TIMELINE_PANEL_TITLE} onClose={closeModal}>
              {renderSidebarContent()}
            </ChangeHistorySidebarPanel>
          </div>
        </EuiModalBody>
      </EuiModal>

      {restoreConfirmChange ? (
        <ChangeHistoryRestoreConfirmModal
          change={restoreConfirmChange}
          currentChange={currentChange}
          onClose={() => setRestoreConfirmChangeId(undefined)}
          onRestored={unlockSelectionDecision}
        />
      ) : null}
    </ChangeHistoryModalSelectionContext.Provider>
  );
}
