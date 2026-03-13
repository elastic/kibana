/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';

interface ManagementBottomBarProps {
  confirmButtonText?: string;
  disabled?: boolean;
  insufficientPrivileges?: boolean;
  isLoading?: boolean;
  isInvalid?: boolean;
  streamType?: 'classic' | 'wired' | 'query' | 'unknown';
  onCancel: () => void;
  onConfirm: () => void;
  onViewCodeClick?: () => void;
}

export function ManagementBottomBar({
  confirmButtonText = defaultConfirmButtonText,
  disabled = false,
  isLoading = false,
  insufficientPrivileges = false,
  isInvalid = false,
  streamType,
  onCancel,
  onConfirm,
  onViewCodeClick,
}: ManagementBottomBarProps) {
  const handleCancel = useDiscardConfirm(onCancel, {
    title: discardUnsavedChangesTitle,
    message: discardUnsavedChangesMessage,
    confirmButtonText: discardUnsavedChangesLabel,
    cancelButtonText: keepEditingLabel,
  });

  return (
    <EuiBottomBar usePortal={false}>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        responsive={false}
        gutterSize="s"
      >
        {onViewCodeClick && (
          <EuiButtonEmpty
            data-test-subj="streamsAppManagementBottomBarViewRequestButton"
            data-stream-type={streamType}
            color="text"
            size="s"
            iconType="editorCodeBlock"
            onClick={onViewCodeClick}
            disabled={isInvalid}
          >
            {viewCodeButtonText}
          </EuiButtonEmpty>
        )}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            justifyContent="center"
            alignItems="center"
            responsive={false}
            gutterSize="s"
          >
            <EuiButtonEmpty
              data-test-subj="streamsAppManagementBottomBarCancelChangesButton"
              data-stream-type={streamType}
              disabled={disabled}
              color="text"
              size="s"
              iconType="cross"
              onClick={handleCancel}
            >
              {i18n.translate('xpack.streams.streamDetailView.managementTab.bottomBar.cancel', {
                defaultMessage: 'Cancel changes',
              })}
            </EuiButtonEmpty>
            <EuiToolTip
              content={
                isInvalid
                  ? i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.bottomBar.fixErrors',
                      {
                        defaultMessage: 'Please fix the errors before saving.',
                      }
                    )
                  : insufficientPrivileges
                  ? i18n.translate(
                      'xpack.streams.streamDetailView.managementTab.bottomBar.onlySimulate',
                      {
                        defaultMessage: "You don't have sufficient privileges to save changes.",
                      }
                    )
                  : undefined
              }
            >
              <EuiButton
                data-test-subj="streamsAppManagementBottomBarButton"
                data-stream-type={streamType}
                disabled={disabled || insufficientPrivileges || isInvalid}
                color="primary"
                fill
                size="s"
                iconType="check"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmButtonText}
              </EuiButton>
            </EuiToolTip>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}

const defaultConfirmButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.confirm',
  { defaultMessage: 'Save changes' }
);

const viewCodeButtonText = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.bottomBar.viewCode',
  { defaultMessage: 'View API request' }
);

const discardUnsavedChangesLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.discardUnsavedChangesLabel',
  { defaultMessage: 'Discard unsaved changes' }
);

const keepEditingLabel = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.discardUnsavedChangesKeepEditing',
  { defaultMessage: 'Keep editing' }
);

const discardUnsavedChangesTitle = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.discardUnsavedChangesTitle',
  { defaultMessage: 'Unsaved changes' }
);

const discardUnsavedChangesMessage = i18n.translate(
  'xpack.streams.streamDetailView.managementTab.enrichment.discardUnsavedChangesMessage',
  {
    defaultMessage:
      'You are about to leave this view without saving. All changes will be lost. Do you really want to leave without saving?',
  }
);
