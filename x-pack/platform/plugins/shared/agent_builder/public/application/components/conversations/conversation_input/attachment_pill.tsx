/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const removeAriaLabel = i18n.translate('xpack.agentBuilder.attachmentPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment',
});

export interface AttachmentPillProps {
  attachment: Attachment;
  onRemoveAttachment?: () => void;
}

export const AttachmentPill: React.FC<AttachmentPillProps> = ({
  attachment,
  onRemoveAttachment,
}) => {
  const { attachmentsService } = useAgentBuilderServices();
  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const displayName = uiDefinition?.getLabel(attachment) ?? attachment.type;

  if (onRemoveAttachment) {
    return (
      <EuiBadge
        color="hollow"
        data-test-subj={`agentBuilderAttachmentPill-${attachment.id}`}
        iconType="cross"
        iconOnClick={onRemoveAttachment}
        iconOnClickAriaLabel={removeAriaLabel}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.REMOVE_ATTACHMENT,
          detail: 'conversation',
        })}
      >
        {displayName}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow" data-test-subj={`agentBuilderAttachmentPill-${attachment.id}`}>
      {displayName}
    </EuiBadge>
  );
};
