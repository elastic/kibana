/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KeyboardEvent } from 'react';
import React, { useMemo } from 'react';
import type {
  AttachmentRefOperation,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_OPERATION, getVersion } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

export interface AttachmentReferencePillProps {
  attachment: VersionedAttachment;
  version: number;
  operation: AttachmentRefOperation;
}

const DEFAULT_ICON = 'document';

const labels = {
  read: i18n.translate('xpack.agentBuilder.roundAttachmentReference.read', {
    defaultMessage: 'Read',
  }),
  created: i18n.translate('xpack.agentBuilder.roundAttachmentReference.created', {
    defaultMessage: 'Created',
  }),
  updated: i18n.translate('xpack.agentBuilder.roundAttachmentReference.updated', {
    defaultMessage: 'Updated',
  }),
  deleted: i18n.translate('xpack.agentBuilder.roundAttachmentReference.deleted', {
    defaultMessage: 'Deleted',
  }),
  restored: i18n.translate('xpack.agentBuilder.roundAttachmentReference.restored', {
    defaultMessage: 'Restored',
  }),
};

const getOperationLabel = (operation: AttachmentRefOperation): string => {
  switch (operation) {
    case ATTACHMENT_REF_OPERATION.read:
      return labels.read;
    case ATTACHMENT_REF_OPERATION.created:
      return labels.created;
    case ATTACHMENT_REF_OPERATION.updated:
      return labels.updated;
    case ATTACHMENT_REF_OPERATION.deleted:
      return labels.deleted;
    case ATTACHMENT_REF_OPERATION.restored:
      return labels.restored;
    default:
      return operation;
  }
};

export const AttachmentReferencePill: React.FC<AttachmentReferencePillProps> = ({
  attachment,
  version,
  operation,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { euiTheme } = useEuiTheme();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const versionData = useMemo(() => getVersion(attachment, version), [attachment, version]);

  const displayName = useMemo(() => {
    if (attachment.description) {
      return attachment.description;
    }
    if (uiDefinition?.getLabel && versionData) {
      const mockAttachment = {
        id: attachment.id,
        type: attachment.type,
        data: versionData.data,
        ...(attachment.origin !== undefined && { origin: attachment.origin }),
      };
      return uiDefinition.getLabel(mockAttachment as any);
    }
    return attachment.type;
  }, [attachment, uiDefinition, versionData]);

  const iconType = uiDefinition?.getIcon?.() ?? DEFAULT_ICON;
  const operationLabel = getOperationLabel(operation);
  const onPillClick =
    uiDefinition?.onClick && versionData
      ? () =>
          uiDefinition.onClick?.({
            attachment: {
              id: attachment.id,
              type: attachment.type,
              data: versionData.data,
              ...(attachment.origin !== undefined && { origin: attachment.origin }),
            },
            version: versionData,
          })
      : undefined;

  const iconContainerStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.small};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const titleStyles = css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  `;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder
      color="subdued"
      paddingSize="s"
      css={css`
        max-width: 220px;
        border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.darkShade};
        ${onPillClick ? 'cursor: pointer;' : ''}
      `}
      role={onPillClick ? 'button' : undefined}
      tabIndex={onPillClick ? 0 : undefined}
      onClick={onPillClick}
      onKeyDown={(event?: KeyboardEvent<HTMLDivElement> | KeyboardEvent<HTMLButtonElement>) => {
        if (!onPillClick) return;
        if (event?.key === 'Enter' || event?.key === ' ') {
          event?.preventDefault();
          onPillClick();
        }
      }}
      data-test-subj={`agentBuilderAttachmentReferencePill-${attachment.id}-v${version}`}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <div className={iconContainerStyles}>
            <EuiIcon type={iconType} size="m" color="primary" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 0 }}>
          <EuiText size="xs" className={titleStyles}>
            <strong>{displayName}</strong>
          </EuiText>
          <EuiText size="xs" color="subdued">
            {operationLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
