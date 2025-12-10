/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { getLatestVersion } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

export interface ConversationAttachmentItemProps {
  attachment: VersionedAttachment;
  isDeleted?: boolean;
  /** Whether the attachment is referenced in any conversation round */
  isReferenced?: boolean;
  /** Soft delete handler (marks as deleted, can restore) */
  onDelete?: () => void;
  /** Permanent delete handler (completely removes, only for unreferenced attachments) */
  onPermanentDelete?: () => void;
  onRestore?: () => void;
  /** Click handler to open the attachment viewer */
  onClick?: () => void;
}

const labels = {
  softDeleteTooltip: i18n.translate('xpack.onechat.attachments.softDeleteTooltip', {
    defaultMessage: 'Remove from context (can restore later)',
  }),
  permanentDeleteTooltip: i18n.translate('xpack.onechat.attachments.permanentDeleteTooltip', {
    defaultMessage: 'Delete permanently (cannot be restored)',
  }),
  deleteMenuTooltip: i18n.translate('xpack.onechat.attachments.deleteMenuTooltip', {
    defaultMessage: 'Delete options',
  }),
  softDeleteLabel: i18n.translate('xpack.onechat.attachments.softDeleteLabel', {
    defaultMessage: 'Remove from context',
  }),
  permanentDeleteLabel: i18n.translate('xpack.onechat.attachments.permanentDeleteLabel', {
    defaultMessage: 'Delete permanently',
  }),
};

export const ConversationAttachmentItem: React.FC<ConversationAttachmentItemProps> = ({
  attachment,
  isDeleted = false,
  isReferenced = false,
  onDelete,
  onPermanentDelete,
  onRestore,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useOnechatServices();
  const latestVersion = getLatestVersion(attachment);
  const tokens = latestVersion?.estimated_tokens;
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);

  // Get UI definition for display name and icon
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const displayName = attachment.description || uiDefinition?.getLabel(attachment as any) || attachment.type;
  const iconType = uiDefinition?.getIcon?.() || 'document';

  const badgeStyles = onClick
    ? css`
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.02);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `
    : undefined;

  const handleBadgeClick = () => {
    onClick?.();
  };

  const closeDeletePopover = () => setIsDeletePopoverOpen(false);

  // Build delete menu panels
  const deleteMenuPanels = [
    {
      id: 0,
      items: [
        ...(onDelete
          ? [
              {
                name: labels.softDeleteLabel,
                icon: 'eyeClosed',
                toolTipContent: labels.softDeleteTooltip,
                onClick: () => {
                  closeDeletePopover();
                  onDelete();
                },
              },
            ]
          : []),
        ...(onPermanentDelete
          ? [
              {
                name: labels.permanentDeleteLabel,
                icon: 'trash',
                toolTipContent: labels.permanentDeleteTooltip,
                onClick: () => {
                  closeDeletePopover();
                  onPermanentDelete();
                },
              },
            ]
          : []),
      ],
    },
  ];

  // Show delete options:
  // - If only soft delete is available (referenced attachment), show single button
  // - If both options available (unreferenced), show dropdown menu
  const showDeleteMenu = !isDeleted && onDelete && onPermanentDelete;
  const showSingleDeleteButton = !isDeleted && onDelete && !onPermanentDelete;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={
              onClick
                ? i18n.translate('xpack.onechat.attachments.clickToView', {
                    defaultMessage: 'Click to view attachment',
                  })
                : displayName
            }
          >
            <EuiBadge
              color={isDeleted ? 'hollow' : 'default'}
              iconType={iconType}
              style={isDeleted ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
              css={badgeStyles}
              onClick={onClick ? handleBadgeClick : undefined}
              onClickAriaLabel={
                onClick
                  ? i18n.translate('xpack.onechat.attachments.viewAriaLabel', {
                      defaultMessage: 'View attachment',
                    })
                  : undefined
              }
              data-test-subj={`conversationAttachmentItem-${attachment.id}`}
            >
              {displayName}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.onechat.attachments.versionTooltip', {
              defaultMessage: 'Version {version}',
              values: { version: attachment.current_version },
            })}
          >
            <EuiText size="xs" color="subdued">
              v{attachment.current_version}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>

        {tokens && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachments.tokensTooltip', {
                defaultMessage: 'Estimated {tokens} tokens',
                values: { tokens },
              })}
            >
              <EuiText size="xs" color="subdued">
                ~{tokens}t
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        )}

        {attachment.description && !onClick && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={attachment.description}>
              <EuiButtonIcon
                iconType="iInCircle"
                aria-label={i18n.translate('xpack.onechat.attachments.descriptionAriaLabel', {
                  defaultMessage: 'View description',
                })}
                size="xs"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}

        {isDeleted && onRestore && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachments.restoreTooltip', {
                defaultMessage: 'Restore attachment',
              })}
            >
              <EuiButtonIcon
                iconType="refresh"
                aria-label={i18n.translate('xpack.onechat.attachments.restoreAriaLabel', {
                  defaultMessage: 'Restore',
                })}
                size="xs"
                onClick={onRestore}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}

        {/* Single delete button for referenced attachments (soft delete only) */}
        {showSingleDeleteButton && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.softDeleteTooltip}>
              <EuiButtonIcon
                iconType="eyeClosed"
                aria-label={labels.softDeleteLabel}
                size="xs"
                color="danger"
                onClick={onDelete}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}

        {/* Delete menu for unreferenced attachments (soft delete or permanent delete) */}
        {showDeleteMenu && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiToolTip content={labels.deleteMenuTooltip}>
                  <EuiButtonIcon
                    iconType="trash"
                    aria-label={labels.deleteMenuTooltip}
                    size="xs"
                    color="danger"
                    onClick={() => setIsDeletePopoverOpen(!isDeletePopoverOpen)}
                  />
                </EuiToolTip>
              }
              isOpen={isDeletePopoverOpen}
              closePopover={closeDeletePopover}
              panelPaddingSize="none"
              anchorPosition="downRight"
            >
              <EuiContextMenu initialPanelId={0} panels={deleteMenuPanels} size="s" />
            </EuiPopover>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
