/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { VersionedAttachment } from '@kbn/onechat-common/attachments';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

export type AttachmentOperationType = 'created' | 'updated' | 'deleted' | 'restored';

export interface AttachmentVersionTagProps {
  /** The attachment being referenced */
  attachment: VersionedAttachment;
  /** The version number to display */
  version: number;
  /** The type of operation that occurred */
  operation: AttachmentOperationType;
  /** Click handler to open viewer at this version */
  onClick: () => void;
}

/**
 * Gets the color for the operation badge.
 */
const getOperationColor = (operation: AttachmentOperationType): string => {
  switch (operation) {
    case 'created':
      return 'success';
    case 'updated':
      return 'primary';
    case 'deleted':
      return 'danger';
    case 'restored':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * Gets the icon for the operation.
 */
const getOperationIcon = (operation: AttachmentOperationType): string => {
  switch (operation) {
    case 'created':
      return 'plus';
    case 'updated':
      return 'pencil';
    case 'deleted':
      return 'trash';
    case 'restored':
      return 'refresh';
    default:
      return 'document';
  }
};

/**
 * Gets the operation label.
 */
const getOperationLabel = (operation: AttachmentOperationType): string => {
  switch (operation) {
    case 'created':
      return i18n.translate('xpack.onechat.attachmentVersionTag.created', {
        defaultMessage: 'Created',
      });
    case 'updated':
      return i18n.translate('xpack.onechat.attachmentVersionTag.updated', {
        defaultMessage: 'Updated',
      });
    case 'deleted':
      return i18n.translate('xpack.onechat.attachmentVersionTag.deleted', {
        defaultMessage: 'Deleted',
      });
    case 'restored':
      return i18n.translate('xpack.onechat.attachmentVersionTag.restored', {
        defaultMessage: 'Restored',
      });
    default:
      return operation;
  }
};

/**
 * Tag component showing an attachment version reference in conversation history.
 * Clicking opens the attachment viewer at the specific version.
 */
export const AttachmentVersionTag: React.FC<AttachmentVersionTagProps> = ({
  attachment,
  version,
  operation,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useOnechatServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const displayName =
    attachment.description || uiDefinition?.getLabel(attachment as any) || attachment.type;
  const iconType = uiDefinition?.getIcon?.() || 'document';
  const operationIcon = getOperationIcon(operation);
  const operationColor = getOperationColor(operation);
  const operationLabel = getOperationLabel(operation);

  const tagStyles = css`
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.02);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &:focus {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 2px;
    }
  `;

  const tooltipContent = (
    <div>
      <strong>{displayName}</strong>
      <br />
      {i18n.translate('xpack.onechat.attachmentVersionTag.tooltip', {
        defaultMessage: '{operation} at version {version}',
        values: { operation: operationLabel, version },
      })}
      <br />
      <small>
        {i18n.translate('xpack.onechat.attachmentVersionTag.clickToView', {
          defaultMessage: 'Click to view',
        })}
      </small>
    </div>
  );

  return (
    <EuiToolTip content={tooltipContent} position="top">
      <EuiBadge
        css={tagStyles}
        color={operationColor}
        onClick={onClick}
        onClickAriaLabel={i18n.translate('xpack.onechat.attachmentVersionTag.ariaLabel', {
          defaultMessage: 'View attachment {name} at version {version}',
          values: { name: displayName, version },
        })}
        iconType={operationIcon}
        iconSide="left"
        data-test-subj={`attachmentVersionTag-${attachment.id}-v${version}`}
      >
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <small>v{version}</small>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    </EuiToolTip>
  );
};
