/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPopover,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import React from 'react';
import { KnowledgeIndicatorFeatureDetailsContent } from '../../stream_detail_significant_events_view/knowledge_indicator_details_flyout';
import { DeleteFeatureModal } from './delete_feature_modal';

interface FeatureDetailsFlyoutProps {
  feature: Feature;
  onClose: () => void;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  onExclude?: () => Promise<void>;
  isExcluding?: boolean;
  onRestore?: () => Promise<void>;
  isRestoring?: boolean;
}

export function FeatureDetailsFlyout({
  feature,
  onClose,
  onDelete,
  isDeleting = false,
  onExclude,
  isExcluding = false,
  onRestore,
  isRestoring = false,
}: FeatureDetailsFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'featureDetailsFlyoutTitle',
  });
  const [isActionsPopoverOpen, { off: closeActionsPopover, toggle: toggleActionsPopover }] =
    useBoolean(false);
  const [isDeleteModalVisible, { on: showDeleteModal, off: hideDeleteModal }] = useBoolean(false);

  const handleDeleteClick = () => {
    closeActionsPopover();
    showDeleteModal();
  };

  const handleExcludeClick = () => {
    closeActionsPopover();
    onExclude?.();
  };

  const handleRestoreClick = () => {
    closeActionsPopover();
    onRestore?.();
  };

  const displayTitle = feature.title ?? feature.id;
  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{displayTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {(onDelete || onExclude || onRestore) && (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                    button={
                      <EuiButtonIcon
                        data-test-subj="streamsAppFeatureDetailsFlyoutActionsButton"
                        iconType="boxesVertical"
                        aria-label={ACTIONS_BUTTON_ARIA_LABEL}
                        onClick={toggleActionsPopover}
                        isLoading={isExcluding || isRestoring}
                      />
                    }
                    isOpen={isActionsPopoverOpen}
                    closePopover={closeActionsPopover}
                    panelPaddingSize="none"
                    anchorPosition="downRight"
                  >
                    <EuiContextMenuPanel
                      size="s"
                      items={[
                        ...(onRestore
                          ? [
                              <EuiContextMenuItem
                                key="restore"
                                icon={<EuiIcon type="eye" color="primary" aria-hidden={true} />}
                                css={css`
                                  color: ${euiTheme.colors.primary};
                                `}
                                onClick={handleRestoreClick}
                                data-test-subj="streamsAppFeatureDetailsFlyoutRestoreAction"
                              >
                                {RESTORE_ACTION_LABEL}
                              </EuiContextMenuItem>,
                            ]
                          : []),
                        ...(onExclude
                          ? [
                              <EuiContextMenuItem
                                key="exclude"
                                icon={
                                  <EuiIcon type="eyeClosed" color="warning" aria-hidden={true} />
                                }
                                css={css`
                                  color: ${euiTheme.colors.warning};
                                `}
                                onClick={handleExcludeClick}
                                data-test-subj="streamsAppFeatureDetailsFlyoutExcludeAction"
                              >
                                {EXCLUDE_ACTION_LABEL}
                              </EuiContextMenuItem>,
                            ]
                          : []),
                        ...(onDelete
                          ? [
                              <EuiContextMenuItem
                                key="delete"
                                icon={<EuiIcon type="trash" color="danger" aria-hidden={true} />}
                                css={css`
                                  color: ${euiTheme.colors.danger};
                                `}
                                onClick={handleDeleteClick}
                                data-test-subj="streamsAppFeatureDetailsFlyoutDeleteAction"
                              >
                                {DELETE_ACTION_LABEL}
                              </EuiContextMenuItem>,
                            ]
                          : []),
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  data-test-subj="streamsAppFeatureDetailsFlyoutCloseButton"
                  iconType="cross"
                  aria-label={CLOSE_BUTTON_ARIA_LABEL}
                  onClick={onClose}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <KnowledgeIndicatorFeatureDetailsContent feature={feature} />
      </EuiFlyoutBody>
      {isDeleteModalVisible && onDelete && (
        <DeleteFeatureModal
          features={[feature]}
          isLoading={isDeleting}
          onCancel={hideDeleteModal}
          onConfirm={onDelete}
        />
      )}
    </EuiFlyout>
  );
}

const ACTIONS_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.actionsButtonAriaLabel',
  { defaultMessage: 'Actions' }
);

const RESTORE_ACTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.restoreAction', {
  defaultMessage: 'Restore',
});

const EXCLUDE_ACTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.excludeAction', {
  defaultMessage: 'Exclude',
});

const DELETE_ACTION_LABEL = i18n.translate('xpack.streams.featureDetailsFlyout.deleteAction', {
  defaultMessage: 'Delete',
});

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.featureDetailsFlyout.closeButtonAriaLabel',
  { defaultMessage: 'Close' }
);
