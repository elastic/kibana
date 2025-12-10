/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';

export interface AttachmentViewerFooterProps {
  /** The attachment being viewed */
  attachment: VersionedAttachment;
  /** Currently selected version number */
  selectedVersion: number;
  /** Whether navigation to previous version is possible */
  canGoBack: boolean;
  /** Whether navigation to next version is possible */
  canGoForward: boolean;
  /** Callback when previous version button is clicked */
  onPreviousVersion: () => void;
  /** Callback when next version button is clicked */
  onNextVersion: () => void;
  /** Callback when version is selected from dropdown */
  onVersionSelect: (version: number) => void;
  /** Whether editing is enabled */
  isEditable: boolean;
  /** Whether currently in edit mode */
  isEditing: boolean;
  /** Callback when edit button is clicked */
  onEdit: () => void;
}

/**
 * Footer component for the attachment viewer flyout.
 * Contains version navigation controls and edit button.
 */
export const AttachmentViewerFooter: React.FC<AttachmentViewerFooterProps> = ({
  attachment,
  selectedVersion,
  canGoBack,
  canGoForward,
  onPreviousVersion,
  onNextVersion,
  onVersionSelect,
  isEditable,
  isEditing,
  onEdit,
}) => {
  // Create version options for the dropdown
  const versionOptions = attachment.versions.map((v) => ({
    value: String(v.version),
    inputDisplay: `v${v.version}`,
    dropdownDisplay: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <strong>v{v.version}</strong>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color={v.status === 'deleted' ? 'danger' : 'subdued'}>
            {v.status === 'deleted'
              ? i18n.translate('xpack.onechat.attachmentViewer.versionDeleted', {
                  defaultMessage: 'deleted',
                })
              : new Date(v.created_at).toLocaleDateString()}
          </EuiText>
        </EuiFlexItem>
        {v.estimated_tokens && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              ~{v.estimated_tokens}t
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  }));

  const handleVersionChange = (value: string) => {
    onVersionSelect(parseInt(value, 10));
  };

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachmentViewer.previousVersion', {
                defaultMessage: 'Previous version',
              })}
            >
              <EuiButtonIcon
                iconType="arrowLeft"
                onClick={onPreviousVersion}
                disabled={!canGoBack}
                aria-label={i18n.translate(
                  'xpack.onechat.attachmentViewer.previousVersionAriaLabel',
                  {
                    defaultMessage: 'Go to previous version',
                  }
                )}
                data-test-subj="attachmentViewerPrevVersion"
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
            <EuiSuperSelect
              options={versionOptions}
              valueOfSelected={String(selectedVersion)}
              onChange={handleVersionChange}
              compressed
              data-test-subj="attachmentViewerVersionSelect"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.onechat.attachmentViewer.versionOf', {
                defaultMessage: 'of {total}',
                values: { total: attachment.versions.length },
              })}
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachmentViewer.nextVersion', {
                defaultMessage: 'Next version',
              })}
            >
              <EuiButtonIcon
                iconType="arrowRight"
                onClick={onNextVersion}
                disabled={!canGoForward}
                aria-label={i18n.translate('xpack.onechat.attachmentViewer.nextVersionAriaLabel', {
                  defaultMessage: 'Go to next version',
                })}
                data-test-subj="attachmentViewerNextVersion"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {isEditable && !isEditing && (
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="pencil"
            onClick={onEdit}
            size="s"
            data-test-subj="attachmentViewerEditButton"
          >
            {i18n.translate('xpack.onechat.attachmentViewer.edit', {
              defaultMessage: 'Edit',
            })}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
