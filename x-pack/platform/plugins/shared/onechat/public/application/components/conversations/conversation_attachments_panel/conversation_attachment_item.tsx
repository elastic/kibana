/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { getLatestVersion } from '@kbn/onechat-common/attachments';

export interface ConversationAttachmentItemProps {
  attachment: VersionedAttachment;
  isDeleted?: boolean;
  onDelete?: () => void;
  onRestore?: () => void;
}

export const ConversationAttachmentItem: React.FC<ConversationAttachmentItemProps> = ({
  attachment,
  isDeleted = false,
  onDelete,
  onRestore,
}) => {
  const latestVersion = getLatestVersion(attachment);
  const tokens = latestVersion?.estimated_tokens;

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={isDeleted ? 'hollow' : 'default'}
            iconType="document"
            style={isDeleted ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
          >
            {attachment.type}
          </EuiBadge>
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

        {attachment.description && (
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

        {!isDeleted && onDelete && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate('xpack.onechat.attachments.deleteTooltip', {
                defaultMessage: 'Delete attachment',
              })}
            >
              <EuiButtonIcon
                iconType="trash"
                aria-label={i18n.translate('xpack.onechat.attachments.deleteAriaLabel', {
                  defaultMessage: 'Delete',
                })}
                size="xs"
                color="danger"
                onClick={onDelete}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
