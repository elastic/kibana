/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiBadge,
  EuiButtonIcon,
  EuiIcon,
  EuiToolTip,
  EuiFieldText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment, AttachmentVersion } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from '../../hooks/use_onechat_service';

export interface AttachmentViewerHeaderProps {
  /** The attachment being viewed */
  attachment: VersionedAttachment;
  /** The specific version being viewed */
  version: AttachmentVersion;
  /** Callback when attachment title is renamed */
  onRename?: (newDescription: string) => Promise<void>;
}

const labels = {
  editTitle: i18n.translate('xpack.onechat.attachmentViewer.editTitle', {
    defaultMessage: 'Edit title',
  }),
  saveTitle: i18n.translate('xpack.onechat.attachmentViewer.saveTitle', {
    defaultMessage: 'Save title',
  }),
  cancelEdit: i18n.translate('xpack.onechat.attachmentViewer.cancelEdit', {
    defaultMessage: 'Cancel',
  }),
  titlePlaceholder: i18n.translate('xpack.onechat.attachmentViewer.titlePlaceholder', {
    defaultMessage: 'Enter attachment title...',
  }),
};

/**
 * Header component for the attachment viewer flyout.
 * Displays attachment type, description, and version info.
 */
export const AttachmentViewerHeader: React.FC<AttachmentViewerHeaderProps> = ({
  attachment,
  version,
  onRename,
}) => {
  const { attachmentsService } = useOnechatServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const defaultDisplayName =
    uiDefinition?.getLabel({ ...attachment, data: version.data }) || attachment.type;
  const displayName = attachment.description || defaultDisplayName;
  const iconType = uiDefinition?.getIcon?.() || 'document';

  // Edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(attachment.description || '');
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Format the creation date
  const createdAt = new Date(version.created_at);
  const formattedDate = createdAt.toLocaleString();

  const handleStartEditTitle = useCallback(() => {
    setEditedTitle(attachment.description || '');
    setIsEditingTitle(true);
  }, [attachment.description]);

  const handleCancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditedTitle(attachment.description || '');
  }, [attachment.description]);

  const handleSaveTitle = useCallback(async () => {
    if (!onRename || !editedTitle.trim()) return;

    setIsSavingTitle(true);
    try {
      await onRename(editedTitle.trim());
      setIsEditingTitle(false);
    } catch (e) {
      // Error handling is done in the parent component
      console.error('Failed to rename attachment:', e);
    } finally {
      setIsSavingTitle(false);
    }
  }, [onRename, editedTitle]);

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleSaveTitle();
      } else if (event.key === 'Escape') {
        handleCancelEditTitle();
      }
    },
    [handleSaveTitle, handleCancelEditTitle]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={iconType} size="l" />
      </EuiFlexItem>

      <EuiFlexItem>
        {isEditingTitle ? (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiFieldText
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                placeholder={labels.titlePlaceholder}
                disabled={isSavingTitle}
                autoFocus
                fullWidth
                data-test-subj="attachmentViewerTitleInput"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isSavingTitle ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <>
                  <EuiToolTip content={labels.saveTitle}>
                    <EuiButtonIcon
                      iconType="check"
                      aria-label={labels.saveTitle}
                      onClick={handleSaveTitle}
                      color="primary"
                      size="s"
                      disabled={!editedTitle.trim()}
                    />
                  </EuiToolTip>
                  <EuiToolTip content={labels.cancelEdit}>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={labels.cancelEdit}
                      onClick={handleCancelEditTitle}
                      color="text"
                      size="s"
                    />
                  </EuiToolTip>
                </>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="s" id="attachmentViewerTitle">
                <h2>{displayName}</h2>
              </EuiTitle>
            </EuiFlexItem>
            {onRename && (
              <EuiFlexItem grow={false}>
                <EuiToolTip content={labels.editTitle}>
                  <EuiButtonIcon
                    iconType="pencil"
                    aria-label={labels.editTitle}
                    onClick={handleStartEditTitle}
                    size="xs"
                    color="text"
                    data-test-subj="attachmentViewerEditTitleButton"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{attachment.type}</EuiBadge>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachmentViewer.versionTooltip', {
                defaultMessage: 'Version {version} of {total}',
                values: { version: version.version, total: attachment.current_version },
              })}
            >
              <EuiBadge color={version.status === 'active' ? 'primary' : 'danger'}>
                v{version.version}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>

          {version.estimated_tokens && (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('xpack.onechat.attachmentViewer.tokensTooltip', {
                  defaultMessage: 'Estimated {tokens} tokens',
                  values: { tokens: version.estimated_tokens },
                })}
              >
                <EuiText size="xs" color="subdued">
                  ~{version.estimated_tokens}t
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          )}

          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachmentViewer.createdAtTooltip', {
                defaultMessage: 'Created at {date}',
                values: { date: formattedDate },
              })}
            >
              <EuiText size="xs" color="subdued">
                {formattedDate}
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>

          {version.status === 'deleted' && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="danger">
                {i18n.translate('xpack.onechat.attachmentViewer.deleted', {
                  defaultMessage: 'Deleted',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
