/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useIsAgentWorkspaceMount } from '../../../hooks/use_navigation';
import { getAttachmentPillLabel } from './get_attachment_pill_label';

const removeAttachmentAriaLabel = i18n.translate(
  'xpack.agentBuilder.attachmentPill.removeAriaLabel',
  {
    defaultMessage: 'Remove attachment',
  }
);

const removePinnedItemAriaLabel = i18n.translate(
  'xpack.agentBuilder.attachmentPill.removePinnedItemAriaLabel',
  {
    defaultMessage: 'Remove pinned item',
  }
);

export interface AttachmentPillProps {
  attachment: Attachment;
  onRemoveAttachment?: () => void;
}

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  attachment,
  onRemoveAttachment,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const removeAriaLabel = isAgentWorkspaceMount
    ? removePinnedItemAriaLabel
    : removeAttachmentAriaLabel;

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;
  const pillLabel = getAttachmentPillLabel(attachment, uiDefinition, displayName);
  const canRemoveAttachment = Boolean(onRemoveAttachment);

  const handleRemoveAttachment = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onRemoveAttachment?.();
    },
    [onRemoveAttachment]
  );

  const badgeStyles = css`
    max-width: 200px;

    .euiBadge__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  const removableBadgeProps = canRemoveAttachment
    ? {
        iconType: 'cross' as const,
        iconSide: 'right' as const,
        iconOnClick: handleRemoveAttachment,
        iconOnClickAriaLabel: removeAriaLabel,
        ...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.REMOVE_ATTACHMENT,
          detail: 'conversation',
        }),
      }
    : {};

  return (
    <EuiBadge
      className={badgeStyles}
      data-test-subj={`agentBuilderAttachmentPill-${attachment.id}`}
      {...removableBadgeProps}
    >
      {pillLabel}
    </EuiBadge>
  );
};
