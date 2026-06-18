/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ChangeHistoryEmptyPrompt } from '../timeline/change_history_empty_prompt';
import { ChangeHistoryTimeline } from '../timeline/change_history_timeline';
import { useChangeHistoryList } from '../../hooks/use_change_history_list';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { ChangeHistoryPreviewPanel } from './change_history_preview_panel';
import * as i18n from '../timeline/translations';

const TIMELINE_PANEL_WIDTH = 400;

export function ChangeHistoryModal(): JSX.Element | null {
  const { euiTheme } = useEuiTheme();
  const {
    adapter,
    objectId,
    renderBadge,
    labels,
    isModalOpen,
    closeModal,
    selectedChangeId,
    setSelectedChangeId,
  } = useChangeHistoryConfig();

  const { items, isLoading, isLoadingMore, loadMore } = useChangeHistoryList({
    adapter,
    objectId,
    enabled: isModalOpen,
  });

  useEffect(() => {
    if (!isModalOpen || selectedChangeId || items.length === 0) {
      return;
    }

    setSelectedChangeId(items[0]?.id);
  }, [isModalOpen, items, selectedChangeId, setSelectedChangeId]);

  const styles = useMemo(
    () => ({
      modalBody: css`
        .euiModalBody__overflow {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }
      `,
      splitLayout: css`
        flex: 1;
        min-height: 0;
        display: flex;
        overflow: hidden;
      `,
      previewPanel: css`
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
        border-right: ${euiTheme.border.thin};
      `,
      timelinePanel: css`
        flex: 0 0 ${TIMELINE_PANEL_WIDTH}px;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: ${euiTheme.colors.backgroundBasePlain};
      `,
      timelineHeader: css`
        padding: ${euiTheme.size.m};
        border-bottom: ${euiTheme.border.thin};
      `,
      timelineBody: css`
        flex: 1;
        min-height: 0;
      `,
      fullEmptyState: css`
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      `,
    }),
    [euiTheme]
  );

  if (!isModalOpen) {
    return null;
  }

  const hasItems = items.length > 0;
  const showLoadingEmpty = isLoading && !hasItems;

  return (
    <EuiModal
      onClose={closeModal}
      maxWidth={false}
      style={{ width: '100vw', height: '100vh' }}
      data-test-subj="changeHistoryModal"
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiModalHeaderTitle>{labels.modalTitle}</EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.CLOSE_MODAL} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                aria-label={i18n.CLOSE_MODAL}
                onClick={closeModal}
                data-test-subj="changeHistoryModalClose"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody css={styles.modalBody}>
        {showLoadingEmpty ? (
          <div css={styles.fullEmptyState} data-test-subj="changeHistoryModalLoading">
            <ChangeHistoryTimeline items={[]} isLoading />
          </div>
        ) : !hasItems ? (
          <div css={styles.fullEmptyState} data-test-subj="changeHistoryModalEmpty">
            <ChangeHistoryEmptyPrompt />
          </div>
        ) : (
          <div css={styles.splitLayout}>
            <div css={styles.previewPanel}>
              <ChangeHistoryPreviewPanel />
            </div>
            <div css={styles.timelinePanel}>
              <div css={styles.timelineHeader}>
                <EuiTitle size="xs">
                  <h2>{i18n.TIMELINE_PANEL_TITLE}</h2>
                </EuiTitle>
              </div>
              <div css={styles.timelineBody}>
                <ChangeHistoryTimeline
                  items={items}
                  selectedItemId={selectedChangeId}
                  isLoading={isLoadingMore}
                  onSelectItem={(item) => setSelectedChangeId(item.id)}
                  onLoadMore={loadMore}
                  renderBadge={renderBadge}
                />
              </div>
            </div>
          </div>
        )}
      </EuiModalBody>
    </EuiModal>
  );
}
